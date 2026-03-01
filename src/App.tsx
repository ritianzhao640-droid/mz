/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  Wallet, 
  Trophy, 
  Coins, 
  Ticket, 
  Clock, 
  Users, 
  ArrowUpRight, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Info,
  Languages
} from 'lucide-react';
import { 
  LOTTERY_CONTRACT_ADDRESS, 
  TOKEN_CONTRACT_ADDRESS, 
  LOTTERY_ABI, 
  ERC20_ABI 
} from './contracts/config';
import { cn, formatAddress, formatEther } from './utils';
import { translations } from './translations';

// --- Types ---
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ContractStats {
  totalStaked: bigint;
  totalPool: bigint;
  currentRound: bigint;
  participantCount: bigint;
  totalTickets: bigint;
  lastLotteryTime: bigint;
  ticketPrice: bigint;
  lotteryInterval: bigint;
  prizeDenominator: bigint;
  maxParticipants: bigint;
}

interface UserStats {
  balance: bigint;
  stakedBalance: bigint;
  earnedRewards: bigint;
  tokenAllowance: bigint;
  decimals: number;
}

type Tab = 'stats' | 'stake' | 'rewards' | 'info';

export default function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [stats, setStats] = useState<ContractStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('00:00');

  const [stakeAmount, setStakeAmount] = useState('');
  const [ticketCount, setTicketCount] = useState('1');
  const [hasConfirmedStake, setHasConfirmedStake] = useState(false);

  const t = translations[lang];

  // --- Blockchain Logic ---

  const connectWallet = async () => {
    if (!window.ethereum || typeof window.ethereum !== 'object') {
      setError(t.errors.installWallet);
      return;
    }
    try {
      setLoading(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }
      setAccount(accounts[0]);
      setProvider(browserProvider);
      setError(null);
    } catch (err: any) {
      setError(err.message || t.errors.connectFailed);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!provider) return;

    // Defensive check for addresses
    const isPlaceholder = (addr: string) => !ethers.isAddress(addr) || addr === ethers.ZeroAddress;
    if (isPlaceholder(LOTTERY_CONTRACT_ADDRESS) || isPlaceholder(TOKEN_CONTRACT_ADDRESS)) {
      console.warn("Contract addresses are still placeholders. Please update src/contracts/config.ts");
      return;
    }

    try {
      const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT_ADDRESS, LOTTERY_ABI, provider);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, ERC20_ABI, provider);

      const [
        totalStaked,
        totalPool,
        currentRound,
        participantCount,
        totalTickets,
        lastLotteryTime,
        ticketPrice,
        lotteryInterval,
        prizeDenominator,
        maxParticipants
      ] = await Promise.all([
        lotteryContract.totalStaked(),
        lotteryContract.totalPool(),
        lotteryContract.currentRound(),
        lotteryContract.getCurrentParticipantCount(),
        lotteryContract.getCurrentTotalTickets(),
        lotteryContract.lastLotteryTime(),
        lotteryContract.TICKET_PRICE(),
        lotteryContract.LOTTERY_INTERVAL(),
        lotteryContract.PRIZE_DENOMINATOR(),
        lotteryContract.MAX_PARTICIPANTS_PER_ROUND()
      ]);

      setStats({
        totalStaked,
        totalPool,
        currentRound,
        participantCount,
        totalTickets,
        lastLotteryTime,
        ticketPrice,
        lotteryInterval,
        prizeDenominator,
        maxParticipants
      });

      if (account && ethers.isAddress(account)) {
        const [balance, stakedBalance, earnedRewards, tokenAllowance, decimals] = await Promise.all([
          tokenContract.balanceOf(account),
          lotteryContract.balanceOf(account),
          lotteryContract.earned(account),
          tokenContract.allowance(account, LOTTERY_CONTRACT_ADDRESS),
          tokenContract.decimals()
        ]);

        setUserStats({
          balance,
          stakedBalance,
          earnedRewards,
          tokenAllowance,
          decimals: Number(decimals)
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, [provider, account]);

  useEffect(() => {
    if (provider) {
      fetchData();
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [provider, fetchData]);

  useEffect(() => {
    if (!stats?.lastLotteryTime || !stats?.lotteryInterval) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const nextDraw = Number(stats.lastLotteryTime) + Number(stats.lotteryInterval);
      const diff = nextDraw - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
      } else {
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats?.lastLotteryTime]);

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    if (!provider || !account) return;
    try {
      setTxPending(true);
      setError(null);
      setSuccess(null);
      const tx = await action();
      await tx.wait();
      setSuccess(successMsg);
      fetchData();
    } catch (err: any) {
      setError(err.reason || err.message || t.errors.txFailed);
    } finally {
      setTxPending(false);
    }
  };

  const approveToken = async (amount: bigint) => {
    const signer = await provider!.getSigner();
    const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, ERC20_ABI, signer);
    return tokenContract.approve(LOTTERY_CONTRACT_ADDRESS, amount);
  };

  const handleStake = async () => {
    if (!stakeAmount || isNaN(Number(stakeAmount))) {
      setError("Invalid stake amount");
      return;
    }
    const amount = ethers.parseEther(stakeAmount);
    if (userStats && userStats.tokenAllowance < amount) {
      await handleAction(() => approveToken(ethers.MaxUint256), t.success.approval);
    }
    const signer = await provider!.getSigner();
    const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT_ADDRESS, LOTTERY_ABI, signer);
    await handleAction(() => lotteryContract.stake(amount), t.success.staking);
    setStakeAmount('');
  };

  const handleBuyTickets = async () => {
    if (!ticketCount || isNaN(Number(ticketCount)) || parseInt(ticketCount) <= 0) {
      setError("Invalid ticket count");
      return;
    }
    const count = BigInt(ticketCount);
    const cost = count * (stats?.ticketPrice || 0n);
    if (userStats && userStats.tokenAllowance < cost) {
      await handleAction(() => approveToken(ethers.MaxUint256), t.success.approval);
    }
    const signer = await provider!.getSigner();
    const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT_ADDRESS, LOTTERY_ABI, signer);
    await handleAction(() => lotteryContract.buyTickets(count), t.success.tickets);
  };

  const handleClaim = async () => {
    const signer = await provider!.getSigner();
    const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT_ADDRESS, LOTTERY_ABI, signer);
    await handleAction(() => lotteryContract.claimReward(), t.success.rewards);
  };

  const handleDraw = async () => {
    const signer = await provider!.getSigner();
    const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT_ADDRESS, LOTTERY_ABI, signer);
    await handleAction(() => lotteryContract.drawLottery(), t.success.draw);
  };

  // --- Render Helpers ---

  const StatCard = ({ title, value, icon: Icon, subValue }: any) => (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl border border-emerald-50 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        {subValue && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{subValue}</span>}
      </div>
      <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </motion.div>
  );

  const NavItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "relative flex flex-col items-center justify-center flex-1 py-3 gap-1 transition-colors",
        activeTab === id ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
      )}
    >
      <Icon className={cn("w-5 h-5 transition-transform", activeTab === id && "scale-110")} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {activeTab === id && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute bottom-0 w-8 h-1 bg-emerald-500 rounded-t-full"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-24 lg:pb-0">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">马彩大乐透</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-500 flex items-center gap-1"
              >
                <Languages className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{lang}</span>
              </button>

              {account ? (
                <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-slate-600">{formatAddress(account)}</span>
                </div>
              ) : (
                <button 
                  onClick={connectWallet}
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  <Wallet className="w-4 h-4" />
                  {loading ? t.connecting : t.connectWallet}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="min-h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title={t.totalStaked} 
                    value={stats ? `${formatEther(stats.totalStaked)} TOKEN` : "---"} 
                    icon={Coins}
                  />
                  <StatCard 
                    title={t.prizePool} 
                    value={stats ? `${formatEther(stats.totalPool)} TOKEN` : "---"} 
                    icon={Trophy}
                    subValue={`${t.round} #${stats?.currentRound.toString() || '1'}`}
                  />
                  <StatCard 
                    title={t.participants} 
                    value={stats ? stats.participantCount.toString() : "0"} 
                    icon={Users}
                    subValue={stats ? `Max ${stats.maxParticipants.toString()}` : t.maxParticipants}
                  />
                  <StatCard 
                    title={t.totalTickets} 
                    value={stats ? stats.totalTickets.toString() : "0"} 
                    icon={Ticket}
                  />
                </div>

                {/* Quick User Stats */}
                {account && userStats && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 flex flex-wrap gap-8 items-center justify-center sm:justify-start">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.yourBalance}</p>
                      <p className="text-xl font-bold text-slate-900">{formatEther(userStats.balance)} TOKEN</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100 hidden sm:block" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.totalStaked}</p>
                      <p className="text-xl font-bold text-emerald-600">{formatEther(userStats.stakedBalance)} TOKEN</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stake' && (
              <motion.div
                key="stake"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Staking Section */}
                <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{t.stakingPool}</h2>
                      <p className="text-sm text-slate-500">{t.stakingDesc}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-amber-800 leading-relaxed">
                          {t.nonRedeemableWarning}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <button 
                        onClick={() => setStakeAmount(userStats ? (Number(userStats.balance) / 1e18).toString() : '0')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded"
                      >
                        MAX
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                      <input 
                        type="checkbox" 
                        id="confirm-stake"
                        checked={hasConfirmedStake}
                        onChange={(e) => setHasConfirmedStake(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="confirm-stake" className="text-xs font-medium text-slate-500 cursor-pointer">
                        {lang === 'en' ? "I understand tokens are non-redeemable" : "我已了解代币不可赎回"}
                      </label>
                    </div>

                    <button 
                      onClick={handleStake}
                      disabled={txPending || !stakeAmount || !account || !hasConfirmedStake}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {txPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                      {t.stakeTokens}
                    </button>
                  </div>
                </section>

                {/* Lottery Section */}
                <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{t.buyTickets}</h2>
                      <p className="text-sm text-slate-500">{t.buyTicketsDesc.replace('{price}', stats ? formatEther(stats.ticketPrice) : "2000")}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1">
                      <button 
                        onClick={() => setTicketCount(Math.max(1, parseInt(ticketCount) - 1).toString())}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        value={ticketCount}
                        onChange={(e) => setTicketCount(e.target.value)}
                        className="flex-1 bg-transparent text-center text-lg font-bold focus:outline-none"
                      />
                      <button 
                        onClick={() => setTicketCount((parseInt(ticketCount) + 1).toString())}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={handleBuyTickets}
                      disabled={txPending || !account}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {txPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Ticket className="w-5 h-5" />}
                      {t.buyN.replace('{count}', ticketCount)}
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'rewards' && (
              <motion.div
                key="rewards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Rewards Card */}
                <section className="bg-emerald-600 rounded-3xl p-8 text-white shadow-lg shadow-emerald-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-bold">{t.wbnbRewards}</h2>
                  </div>
                  
                  <div className="mb-8">
                    <p className="text-emerald-100 text-sm mb-1">{t.unclaimedDividends}</p>
                    <p className="text-4xl font-bold">{userStats ? formatEther(userStats.earnedRewards) : "0.0000"}</p>
                    <p className="text-emerald-200 text-xs mt-2">{t.basedOnStaked.replace('{amount}', userStats ? formatEther(userStats.stakedBalance) : "0")}</p>
                  </div>

                  <button 
                    onClick={handleClaim}
                    disabled={txPending || !account || (userStats && userStats.earnedRewards === 0n)}
                    className="w-full bg-white text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {t.claimWbnb}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </section>

                {/* Draw Lottery Card */}
                <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <Clock className="w-5 h-5 text-slate-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{t.drawLottery}</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t.countdown}</span>
                      <span className="font-mono font-bold text-emerald-600 text-lg">
                        {timeLeft}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t.lastDraw}</span>
                      <span className="font-medium text-slate-900">
                        {stats ? new Date(Number(stats.lastLotteryTime) * 1000).toLocaleTimeString() : "---"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t.interval}</span>
                      <span className="font-medium text-slate-900">
                        {stats ? `${Number(stats.lotteryInterval) / 60} Minutes` : "---"}
                      </span>
                    </div>
                    
                    <button 
                      onClick={handleDraw}
                      disabled={txPending || !account || timeLeft !== '00:00' || stats?.participantCount === 0n}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                        timeLeft === '00:00' && stats?.participantCount !== 0n
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100"
                          : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {timeLeft === '00:00' && stats?.participantCount !== 0n ? t.drawReady : t.drawRound.replace('{round}', stats?.currentRound.toString() || '1')}
                    </button>
                    <p className="text-[10px] text-center text-slate-400">{t.drawNote}</p>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto"
              >
                <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-8">{t.howItWorksTitle}</h2>
                  <div className="space-y-8">
                    {/* Warning Section */}
                    <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex gap-4 items-start">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-bold text-red-700 mb-1">{t.warningTitle}</h3>
                        <p className="text-sm text-red-600 font-medium leading-relaxed">
                          {t.warningDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">1</div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{t.step1Title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{t.step1Desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">2</div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{t.step2Title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{t.step2Desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">3</div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{t.step3Title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {stats ? t.step3Desc.replace('1/160', `1/${stats.prizeDenominator.toString()}`) : t.step3Desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation (Mobile & Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-4 pb-safe">
        <LayoutGroup>
          <div className="max-w-lg mx-auto flex items-center justify-between relative">
            <NavItem id="stats" icon={LayoutDashboard} label={t.nav.stats} />
            <NavItem id="stake" icon={Ticket} label={t.nav.stake} />
            <NavItem id="rewards" icon={Coins} label={t.nav.rewards} />
            <NavItem id="info" icon={Info} label={t.nav.howItWorks} />
          </div>
        </LayoutGroup>
      </div>

      {/* Footer (Hidden on mobile due to bottom nav) */}
      <footer className="hidden lg:block mt-20 border-t border-slate-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">马彩大乐透</span>
          </div>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t.footerDesc}
          </p>
          <div className="mt-8 flex justify-center gap-6 text-xs font-medium text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-emerald-600 transition-colors">{t.links.contract}</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">{t.links.whitepaper}</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">{t.links.community}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Contract Configuration and ABIs
 */

// 彩票合约地址（最新部署）
export const LOTTERY_CONTRACT_ADDRESS = "0x263c3889b042b27ab4EBcb59F575A83c2C41faee";

// 代币合约地址（您的项目代币）
export const TOKEN_CONTRACT_ADDRESS = "0x2619b7c70e73672f948acf5c56228eb8c4927777";

// WBNB合约地址（BSC主网）
export const WBNB_CONTRACT_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// 彩票合约完整ABI（基于最终版合约生成）
export const LOTTERY_ABI = [
  // ========== 视图函数 ==========
  "function token() view returns (address)",
  "function wbnb() view returns (address)",
  "function TICKET_PRICE() view returns (uint256)",
  "function LOTTERY_INTERVAL() view returns (uint256)",
  "function PRIZE_DENOMINATOR() view returns (uint256)",
  "function MAX_PARTICIPANTS_PER_ROUND() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function totalPool() view returns (uint256)",
  "function rewardPerTokenStored() view returns (uint256)",
  "function userRewardPerTokenPaid(address) view returns (uint256)",
  "function rewards(address) view returns (uint256)",
  "function unallocatedWbnb() view returns (uint256)",
  "function lastCheckedWbnb() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function roundTotalTickets(uint256) view returns (uint256)",
  "function lastLotteryTime() view returns (uint256)",
  "function earned(address) view returns (uint256)",
  "function getCurrentParticipants() view returns (address[])",
  "function getCurrentParticipantCount() view returns (uint256)",
  "function getCurrentTotalTickets() view returns (uint256)",

  // ========== 写入函数 ==========
  "function stake(uint256 amount)",
  "function buyTickets(uint256 numTickets)",
  "function claimReward()",
  "function drawLottery()",
  "function setToken(address _token)",

  // ========== 事件 ==========
  "event Staked(address indexed user, uint256 amount)",
  "event TicketsBought(address indexed user, uint256 numTickets, uint256 round)",
  "event LotteryDrawn(uint256 indexed round, uint256 timestamp, address[3] winners, uint256 prize)",
  "event RewardPaid(address indexed user, uint256 wbnbAmount)",
  "event TokenSet(address indexed token)"
];

// 代币合约标准ERC20 ABI（适用于您的项目代币）
export const TOKEN_ABI = [
  // 视图函数
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",

  // 写入函数
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",

  // 事件
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];
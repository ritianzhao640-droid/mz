/**
 * Contract Configuration and ABIs
 */

export const LOTTERY_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with actual address
export const TOKEN_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";   // Replace with actual address
export const WBNB_CONTRACT_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";    // BSC WBNB Address

export const LOTTERY_ABI = [
  "function token() view returns (address)",
  "function wbnb() view returns (address)",
  "function TICKET_PRICE() view returns (uint256)",
  "function LOTTERY_INTERVAL() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function totalPool() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function lastLotteryTime() view returns (uint256)",
  "function earned(address) view returns (uint256)",
  "function stake(uint256 amount)",
  "function buyTickets(uint256 numTickets)",
  "function claimReward()",
  "function drawLottery()",
  "function getCurrentParticipantCount() view returns (uint256)",
  "function getCurrentTotalTickets() view returns (uint256)",
  "event Staked(address indexed user, uint256 amount)",
  "event TicketsBought(address indexed user, uint256 numTickets, uint256 round)",
  "event LotteryDrawn(uint256 indexed round, uint256 timestamp, address[3] winners, uint256 prize)",
  "event RewardPaid(address indexed user, uint256 wbnbAmount)"
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

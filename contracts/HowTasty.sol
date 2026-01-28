// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HowTasty
 * @dev 一个去中心化的美食点评 DApp，支持商家录入、加权投票和 $TASTY 代币奖励系统。
 */
contract HowTasty is ERC20, Ownable, ReentrancyGuard {
    
    // --- 数据结构 ---

    struct Review {
        address voter;
        bool isUpvote;
        string comment;
        string imageHash; // IPFS 哈希 (证据)
        uint256 weight;   // 投票时的实际权重
        uint256 timestamp;
    }

    struct Ad {
        address advertiser;
        string contentHash; // IPFS 哈希 (图片或视频)
        string title;
        string link;        // 广告点击跳转链接 (可选)
        uint256 timestamp;
        bool isVideo;
    }

    struct Merchant {
        uint256 id;
        string name;
        string location;
        string description;
        string category;
        uint256 upVotes;
        uint256 downVotes;
        uint256 totalTastyRewarded; // 该商家累计产出的代币总额
        address creator;            // 录入者 (Curator)
        uint256 createdAt;
        bool exists;
    }

    // --- 状态变量 ---

    uint256 public merchantCount;
    mapping(uint256 => Merchant) public merchants;
    mapping(bytes32 => bool) public merchantExists;
    mapping(uint256 => Review[]) public merchantReviews;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public reputation;
    Ad[] public ads;

    // --- 事件 ---

    event MerchantAdded(uint256 indexed id, string name, string location, address indexed creator);
    event Voted(uint256 indexed id, address indexed voter, bool isUpvote, uint256 weight, string comment, string imageHash);
    event ReputationUpdated(address indexed user, uint256 newReputation);
    event RewardsWithdrawn(address indexed creator, uint256 amount);
    event Redeemed(address indexed user, uint256 tastyAmount, uint256 monAmount);
    event AdPublished(address indexed advertiser, string contentHash, string title, bool isVideo);

    // --- 错误定义 ---

    error MerchantAlreadyExists();
    error MerchantNotFound();
    error AlreadyVoted();
    error InvalidImageHash();
    error InsufficientBalance();
    error InsufficientContractBalance();
    error TransferFailed();

    // --- 状态变量扩展 ---

    uint256 public constant EXCHANGE_RATE = 10; // 10 TASTY = 1 MON
    uint256 public constant AD_COST = 8 * 10**18; // 8 TASTY

    // --- 构造函数 ---

    constructor() ERC20("HowTasty Token", "TASTY") Ownable(msg.sender) {}

    // --- 核心业务逻辑 ---

    /**
     * @dev A. 商家录入 (addMerchant)
     * 唯一性校验基于名称和位置的哈希。
     */
    function addMerchant(
        string memory _name,
        string memory _location,
        string memory _description,
        string memory _category
    ) public nonReentrant {
        bytes32 merchantKey = keccak256(abi.encodePacked(_name, _location));
        if (merchantExists[merchantKey]) revert MerchantAlreadyExists();

        merchantCount++;
        merchants[merchantCount] = Merchant({
            id: merchantCount,
            name: _name,
            location: _location,
            description: _description,
            category: _category,
            upVotes: 0,
            downVotes: 0,
            totalTastyRewarded: 0,
            creator: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        merchantExists[merchantKey] = true;
        emit MerchantAdded(merchantCount, _name, _location, msg.sender);
    }

    /**
     * @dev B. 硬核点评 (vote)
     * 基于声望和证据 (imageHash) 计算权重并奖励 $TASTY。
     */
    function vote(
        uint256 _id,
        bool _isUpvote,
        string memory _comment,
        string memory _imageHash
    ) public nonReentrant {
        if (!merchants[_id].exists) revert MerchantNotFound();
        if (hasVoted[_id][msg.sender]) revert AlreadyVoted();

        // 1. 计算基础权重: 有证据为 5，无证据为 1
        uint256 baseWeight = bytes(_imageHash).length > 0 ? 5 : 1;

        // 2. 声望加成: FinalWeight = BaseWeight * (1 + userReputation / 100)
        uint256 weight = baseWeight + (baseWeight * reputation[msg.sender] / 100);

        // 3. 更新商家票数
        if (_isUpvote) {
            merchants[_id].upVotes += weight;
        } else {
            merchants[_id].downVotes += weight;
        }

        // 4. 记录点评详情
        merchantReviews[_id].push(Review({
            voter: msg.sender,
            isUpvote: _isUpvote,
            comment: _comment,
            imageHash: _imageHash,
            weight: weight,
            timestamp: block.timestamp
        }));

        // 5. 代币奖励: 铸造奖励给点评者
        uint256 rewardAmount = weight * 10**decimals();
        _mint(msg.sender, rewardAmount);

        // 6. 发现者分红: 额外 5% 给商家 creator
        uint256 creatorBonus = (rewardAmount * 5) / 100;
        _mint(merchants[_id].creator, creatorBonus);

        // 更新商家产出记录
        merchants[_id].totalTastyRewarded += (rewardAmount + creatorBonus);

        // 7. 声望增长
        reputation[msg.sender] += 1;
        hasVoted[_id][msg.sender] = true;

        emit Voted(_id, msg.sender, _isUpvote, weight, _comment, _imageHash);
        emit ReputationUpdated(msg.sender, reputation[msg.sender]);
    }

    // --- 查询功能 (Queries) ---

    /**
     * @dev 返回所有商家列表
     */
    function getAllMerchants() public view returns (Merchant[] memory) {
        Merchant[] memory allMerchants = new Merchant[](merchantCount);
        for (uint256 i = 1; i <= merchantCount; i++) {
            allMerchants[i - 1] = merchants[i];
        }
        return allMerchants;
    }

    /**
     * @dev 返回特定商家的完整点评流
     */
    function getMerchantReviews(uint256 _id) public view returns (Review[] memory) {
        return merchantReviews[_id];
    }

    /**
     * @dev 查询特定地址的声望值
     */
    function getUserReputation(address _user) public view returns (uint256) {
        return reputation[_user];
    }

    // --- 管理功能 ---

    /**
     * @dev 允许 Owner 或仲裁合约调整声望 (用于治理)
     */
    function updateReputation(address _user, uint256 _newReputation) public onlyOwner {
        reputation[_user] = _newReputation;
        emit ReputationUpdated(_user, _newReputation);
    }

    // --- 兑换功能 (Exchange) ---

    /**
     * @dev 将 $TASTY 兑换为 MON 测试币
     * 比例: 10 $TASTY = 1 MON
     */
    function redeem(uint256 _tastyAmount) public nonReentrant {
        if (balanceOf(msg.sender) < _tastyAmount) revert InsufficientBalance();
        
        // 计算应获得的 MON 数量 (10:1)
        // 注意: _tastyAmount 包含 18 位小数
        uint256 monAmount = _tastyAmount / EXCHANGE_RATE;
        
        if (address(this).balance < monAmount) revert InsufficientContractBalance();

        // 1. 销毁用户的 $TASTY
        _burn(msg.sender, _tastyAmount);

        // 2. 向用户发送 MON
        (bool success, ) = msg.sender.call{value: monAmount}("");
        if (!success) revert TransferFailed();

        emit Redeemed(msg.sender, _tastyAmount, monAmount);
    }

    /**
     * @dev 允许合约接收 MON (用于补充激励池)
     */
    receive() external payable {}

    /**
     * @dev 允许管理员提取合约中的 MON (紧急情况)
     */
    function withdrawPool(uint256 _amount) public onlyOwner {
        if (address(this).balance < _amount) revert InsufficientContractBalance();
        (bool success, ) = owner().call{value: _amount}("");
        if (!success) revert TransferFailed();
    }

    // --- 广告功能 (Advertising) ---

    /**
     * @dev 发布广告
     * 消耗 20 $TASTY
     */
    function publishAd(
        string memory _title,
        string memory _contentHash,
        string memory _link,
        bool _isVideo
    ) public nonReentrant {
        if (balanceOf(msg.sender) < AD_COST) revert InsufficientBalance();

        // 1. 消耗代币 (销毁)
        _burn(msg.sender, AD_COST);

        // 2. 存储广告
        ads.push(Ad({
            advertiser: msg.sender,
            contentHash: _contentHash,
            title: _title,
            link: _link,
            timestamp: block.timestamp,
            isVideo: _isVideo
        }));

        emit AdPublished(msg.sender, _contentHash, _title, _isVideo);
    }

    /**
     * @dev 获取所有广告
     */
    function getAllAds() public view returns (Ad[] memory) {
        return ads;
    }
}

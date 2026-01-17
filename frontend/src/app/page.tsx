'use client';

import { useState, useEffect, useMemo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { FOOD_VOTING_ABI } from '../constants/abi';
import { PlusCircle, ThumbsUp, ThumbsDown, Utensils, MapPin, Award, Coins, Loader2, MessageSquare, Clock, User, ImageIcon, Filter, TrendingUp, AlertTriangle, Megaphone, ExternalLink, Play } from 'lucide-react';
import { formatEther, parseEther } from 'viem';

const CONTRACT_ADDRESS = '0xeF302213726FF0d17D5d0e8b46fBEF6B48E6ba26' as `0x${string}`;

const getIpfsUrl = (hash: string) => {
  if (!hash) return '';
  if (hash.startsWith('http')) return hash;
  const cleanHash = hash.replace('ipfs://', '');
  
  // Handle mock hashes from demo mode
  if (cleanHash.startsWith('mock-')) {
    return `https://picsum.photos/seed/${cleanHash}/400/400`;
  }
  
  // Use user provided Pinata gateway
  return `https://yellow-glad-falcon-454.mypinata.cloud/ipfs/${cleanHash}`;
};

function ReviewList({ merchantId, onVote, hasVoted, isConnected }: { merchantId: number, onVote: (id: number) => void, hasVoted: boolean, isConnected: boolean }) {
  const { data: reviews, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FOOD_VOTING_ABI,
    functionName: 'getMerchantReviews',
    args: [BigInt(merchantId)],
  });

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-3 mt-4 border-t pt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-bold flex items-center gap-2 text-gray-700">
          <MessageSquare size={14} /> 历史点评 ({reviews ? (reviews as any[]).length : 0})
        </h4>
        {isConnected && !hasVoted && (
          <button 
            onClick={() => onVote(merchantId)}
            className="text-[10px] bg-orange-500 text-white px-2 py-1 rounded font-bold hover:bg-orange-600 transition-colors flex items-center gap-1"
          >
            <PlusCircle size={10} /> 我也要评
          </button>
        )}
      </div>
      {!reviews || (reviews as any[]).length === 0 ? (
        <div className="text-center p-4 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed">暂无点评记录</div>
      ) : (
        (reviews as any[]).slice().reverse().map((review, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${review.isUpvote ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {review.isUpvote ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                </div>
                <span className="font-mono text-[10px] text-gray-500 bg-white px-1 border rounded flex items-center gap-1">
                  <User size={10} /> {review.voter.slice(0, 6)}...{review.voter.slice(-4)}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock size={10} /> {new Date(Number(review.timestamp) * 1000).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-700 mb-2 leading-relaxed">{review.comment}</p>
            {review.imageHash && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded border border-orange-100">
                  <ImageIcon size={10} /> 证据图片
                </div>
                <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-gray-100 flex items-center justify-center">
                  <img 
                    src={getIpfsUrl(review.imageHash)} 
                    alt="Review evidence" 
                    className="w-full h-full object-cover cursor-zoom-in transition-transform group-hover:scale-105"
                    onClick={() => window.open(getIpfsUrl(review.imageHash), '_blank')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const cleanHash = review.imageHash.replace('ipfs://', '');
                      
                      if (target.src.includes('mypinata.cloud')) {
                        // Try public gateway as first fallback
                        target.src = `https://ipfs.io/ipfs/${cleanHash}`;
                      } else if (target.src.includes('ipfs.io')) {
                        // Try cloudflare as second fallback
                        target.src = `https://cloudflare-ipfs.com/ipfs/${cleanHash}`;
                      } else {
                        target.src = 'https://placehold.co/400x400?text=Image+Load+Failed';
                        target.className = 'w-1/2 h-1/2 object-contain opacity-20';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function MerchantCard({ 
  merchant, 
  address, 
  onVote, 
  onToggleExpand, 
  isExpanded 
}: { 
  merchant: any, 
  address: `0x${string}` | undefined, 
  onVote: (id: number) => void,
  onToggleExpand: (id: number) => void,
  isExpanded: boolean
}) {
  const { data: hasVoted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FOOD_VOTING_ABI,
    functionName: 'hasVoted',
    args: address ? [merchant.id, address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-md mb-2">
              {merchant.category}
            </span>
            <h3 className="text-xl font-bold">{merchant.name}</h3>
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
              <MapPin size={12} />
              <span>{merchant.location}</span>
            </div>
          </div>
          <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${
            (Number(merchant.upVotes) - Number(merchant.downVotes)) >= 0 
            ? 'bg-green-50 border-green-100 text-green-700' 
            : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            <span className="text-[10px] font-bold uppercase opacity-60">信誉分</span>
            <span className="text-lg font-black">
              {(Number(merchant.upVotes) - Number(merchant.downVotes)).toString()}
            </span>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">
          {merchant.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-700 border border-yellow-100">
            <Coins size={10} />
            <span>产出 {Number(formatEther(merchant.totalTastyRewarded)).toFixed(1)} $TASTY</span>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 border border-blue-100">
            <User size={10} />
            <span>发现者 {merchant.creator.slice(0, 4)}...{merchant.creator.slice(-4)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-4">
            <div className="flex items-center gap-1 text-green-600">
              <ThumbsUp size={18} />
              <span className="font-semibold">{merchant.upVotes.toString()}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <ThumbsDown size={18} />
              <span className="font-semibold">{merchant.downVotes.toString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onToggleExpand(Number(merchant.id))}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors font-medium"
            >
              <MessageSquare size={14} />
              {isExpanded ? '收起点评' : '查看点评'}
            </button>
            <button
              onClick={() => onVote(Number(merchant.id))}
              disabled={!address || !!hasVoted}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                !!hasVoted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
              }`}
            >
              {!!hasVoted ? (
                <>
                  <Award size={14} />
                  已评价
                </>
              ) : (
                <>
                  <ImageIcon size={14} />
                  去评价
                </>
              )}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <ReviewList 
            merchantId={Number(merchant.id)} 
            onVote={onVote}
            hasVoted={!!hasVoted}
            isConnected={!!address}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', description: '', location: '', category: '餐厅' });
  const [votingMerchantId, setVotingMerchantId] = useState<number | null>(null);
  const [voteData, setVoteData] = useState({ comment: '', isUpvote: true, imageHash: '' });
  const [expandedMerchantId, setExpandedMerchantId] = useState<number | null>(null);
  const [showRankings, setShowRankings] = useState(false);
  const [showUserCenter, setShowUserCenter] = useState(false);
  const [showPublishAd, setShowPublishAd] = useState(false);
  const [adData, setAdData] = useState({ title: '', contentHash: '', link: '', isVideo: false });
  const [redeemAmount, setRedeemAmount] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  
  // New state for sorting and filtering
  const [sortBy, setSortBy] = useState<'newest' | 'score'>('newest');
  const [filterCategory, setFilterCategory] = useState<string>('全部');

  // 1. Fetch Merchants
  const { data: merchants, refetch: refetchMerchants } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FOOD_VOTING_ABI,
    functionName: 'getAllMerchants',
  });

  // 2. Fetch User Reputation
  const { data: userReputation, refetch: refetchReputation } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FOOD_VOTING_ABI,
    functionName: 'getUserReputation',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // 3. Fetch User $TASTY Balance
  const { data: tastyBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FOOD_VOTING_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // 4. Fetch Ads
  const { data: ads, refetch: refetchAds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FOOD_VOTING_ABI,
    functionName: 'getAllAds',
  });

  // 5. Fetch Contract MON Balance (Reward Pool)
  const { data: poolBalance, refetch: refetchPoolBalance } = useBalance({
    address: CONTRACT_ADDRESS,
  });

  // 5. Filtered and Sorted Merchants
  const processedMerchants = useMemo(() => {
    if (!merchants) return [];
    let list = [...(merchants as any[])];
    
    // Category filter
    if (filterCategory !== '全部') {
      list = list.filter(m => m.category === filterCategory);
    }
    
    // Sort
    if (sortBy === 'newest') {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    } else {
      list.sort((a, b) => {
        const scoreA = Number(a.upVotes) - Number(a.downVotes);
        const scoreB = Number(b.upVotes) - Number(b.downVotes);
        return scoreB - scoreA;
      });
    }
    return list;
  }, [merchants, filterCategory, sortBy]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !redeemAmount || isPending) return;
    
    setIsError(false);
    setErrorMessage(null);

    try {
      const amount = parseEther(redeemAmount);
      
      // Check if pool balance is sufficient (10:1 ratio)
      const neededMon = amount / BigInt(10);
      if (poolBalance && poolBalance.value < neededMon) {
        throw new Error(`奖励池资金不足 (仅剩 ${poolBalance.formatted} MON)，请稍后再试或联系管理员补充。`);
      }

      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: FOOD_VOTING_ABI,
        functionName: 'redeem',
        args: [amount],
        gas: BigInt(200000),
      } as any);
      
      if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
        throw new Error("交易发送失败");
      }
      setRedeemAmount('');
    } catch (err: any) {
      console.error("Redeem failed:", err);
      setIsError(true);
      setErrorMessage(err.message || "兑换失败");
    }
  };

  const categories = ['全部', '餐厅', '小吃', '甜品', '饮品'];

  const { writeContractAsync, data: hash, isPending, error: writeError } = useWriteContract();
  
  // Robustly extract transaction hash string
  const txHashString = useMemo(() => {
    if (!hash) return '';
    
    let extractedHash = '';
    if (typeof hash === 'string') {
      extractedHash = hash;
    } else if (typeof hash === 'object') {
      extractedHash = (hash as any).hash || (hash as any).transactionHash || '';
    }

    // Ensure it's a valid hex string starting with 0x
    if (extractedHash && typeof extractedHash === 'string' && extractedHash.startsWith('0x')) {
      return extractedHash;
    }
    
    return '';
  }, [hash]);

  // Log the actual hash when it appears
  useEffect(() => {
    if (txHashString) {
      console.log("Transaction Hash obtained:", txHashString);
    }
  }, [txHashString]);

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ 
    hash: txHashString as `0x${string}` 
  });

  // Log and handle errors for debugging and UI
  useEffect(() => {
    if (writeError || confirmError) {
      const error = writeError || confirmError;
      console.error("Transaction Error:", error);
      
      let msg = "交易失败";
      const errorStr = String(error);
      
      if (errorStr.includes("AlreadyVoted")) {
        msg = "您已经评价过该商家了，不可重复评价";
      } else if (errorStr.includes("MerchantNotFound")) {
        msg = "未找到该商家信息";
      } else if (errorStr.includes("User rejected")) {
        msg = "用户取消了交易签名";
      } else if (errorStr.includes("insufficient funds")) {
        msg = "账户余额不足 (MON)";
      } else if (errorStr.includes("Gas limit too low")) {
        msg = "Gas 限制过低，请尝试增加 Gas 或重试";
      } else if (errorStr.includes("reverted") || errorStr.includes("Execution reverted")) {
        msg = "合约执行被拒绝: 可能您已评价过该商家，或该商家不存在。";
      } else if (errorStr.includes("CallExecutionError")) {
        msg = "链上执行失败: 交易被合约拒绝。";
      }
      
      setIsError(true);
      setErrorMessage(msg);
      // Ensure we clear the pending states if there's an error
      if (confirmError) {
        console.log("Confirm error detected, showing toast...");
      }
    }
  }, [writeError, confirmError]);

  // Calculate estimated voting weight
  const estimatedWeight = useMemo(() => {
    const base = voteData.imageHash.length > 0 ? 5 : 1;
    const rep = userReputation ? Number(userReputation) : 0;
    return base + Math.floor((base * rep) / 100);
  }, [voteData.imageHash, userReputation]);

  // Refetch data after transaction success
  useEffect(() => {
    if (isConfirmed) {
      refetchMerchants();
      refetchReputation();
      refetchBalance();
      refetchAds();
      refetchPoolBalance();
      // Reset voting state
      setVoteData({ comment: '', isUpvote: true, imageHash: '' });
    }
  }, [isConfirmed, refetchMerchants, refetchReputation, refetchBalance]);

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setIsError(false);
    setErrorMessage(null);
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: FOOD_VOTING_ABI,
        functionName: 'addMerchant',
        args: [newMerchant.name, newMerchant.location, newMerchant.description, newMerchant.category],
        gas: BigInt(500000), // Manually set gas limit to avoid estimation issues
      } as any);

      // Check if txHash is actually a hash string or an error object
      if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
        throw new Error(typeof txHash === 'object' ? (txHash as any).message || "交易发送失败" : "无效的交易哈希");
      }

      console.log("Transaction sent! Hash:", txHash);
      setShowAddMerchant(false);
    } catch (err: any) {
      console.error("Add merchant failed:", err);
      setIsError(true);
      setErrorMessage(err.message || "商家录入失败");
    }
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (votingMerchantId === null || !address || isUploading) return;
    
    setIsError(false);
    setErrorMessage(null);
    
    console.log("Preparing transaction with parameters:", {
      merchantId: votingMerchantId,
      isUpvote: voteData.isUpvote,
      comment: voteData.comment,
      imageHash: voteData.imageHash
    });

    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: FOOD_VOTING_ABI,
        functionName: 'vote',
        args: [BigInt(votingMerchantId), voteData.isUpvote, voteData.comment, voteData.imageHash],
        gas: BigInt(500000), // Manually set gas limit to avoid estimation issues
      } as any);
      
      // Check if txHash is actually a hash string or an error object
      if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
        throw new Error(typeof txHash === 'object' ? (txHash as any).message || "交易发送失败" : "无效的交易哈希");
      }

      console.log("Transaction sent! Hash:", txHash);
      setVotingMerchantId(null);
    } catch (err: any) {
      console.error("Transaction initiation failed:", err);
      setIsError(true);
      setErrorMessage(err.message || "投票提交失败");
    }
  };

  const handlePublishAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || isUploading || !adData.contentHash) return;
    
    setIsError(false);
    setErrorMessage(null);

    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: FOOD_VOTING_ABI,
        functionName: 'publishAd',
        args: [adData.title, adData.contentHash, adData.link, adData.isVideo],
        gas: BigInt(500000),
      } as any);
      
      if (typeof txHash !== 'string' || !txHash.startsWith('0x')) {
        throw new Error("交易发送失败");
      }
      setShowPublishAd(false);
      setAdData({ title: '', contentHash: '', link: '', isVideo: false });
    } catch (err: any) {
      console.error("Publish ad failed:", err);
      setIsError(true);
      setErrorMessage(err.message || "广告发布失败");
    }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if it's a video
    const isVideo = file.type.startsWith('video/');
    
    // Pinata API Keys
    const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMDc1ZTg1NC1lYTA1LTQ2YzctODA3ZC01N2ZiMjYzNDg5MjciLCJlbWFpbCI6IjI4MTQzMDY0NTBAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImM0ZjdlYzlkNmU4N2NkNDJlMmM3Iiwic2NvcGVkS2V5U2VjcmV0IjoiN2E5YzczMzA1MmM0MDljY2MxNDNhMzU0Yzg2MmYxMzUxODM3NTIxZjU2Y2E3OTUxNTQwMjNhZGRkOTJkNWMzOCIsImV4cCI6MTgwMDE2OTI5OH0.7ewnUukO6ppCglzvNCYGkkt-EzQD_2QG83y9wHYjMo8"; 

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const metadata = JSON.stringify({
        name: `HowTasty_Ad_${Date.now()}`,
      });
      formData.append('pinataMetadata', metadata);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT.trim()}`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error(`Pinata error: ${res.status}`);
      }
      
      const resData = await res.json();
      setAdData(prev => ({ ...prev, contentHash: `ipfs://${resData.IpfsHash}`, isVideo }));
      setUploadProgress(100);
    } catch (error: any) {
      console.error("Ad upload failed:", error);
      alert(`媒体上传失败: ${error.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Starting IPFS upload for file:", file.name, file.size, file.type);

    // Pinata API Keys
    const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMDc1ZTg1NC1lYTA1LTQ2YzctODA3ZC01N2ZiMjYzNDg5MjciLCJlbWFpbCI6IjI4MTQzMDY0NTBAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImM0ZjdlYzlkNmU4N2NkNDJlMmM3Iiwic2NvcGVkS2V5U2VjcmV0IjoiN2E5YzczMzA1MmM0MDljY2MxNDNhMzU0Yzg2MmYxMzUxODM3NTIxZjU2Y2E3OTUxNTQwMjNhZGRkOTJkNWMzOCIsImV4cCI6MTgwMDE2OTI5OH0.7ewnUukO6ppCglzvNCYGkkt-EzQD_2QG83y9wHYjMo8"; 

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const metadata = JSON.stringify({
        name: `HowTasty_${Date.now()}`,
      });
      formData.append('pinataMetadata', metadata);

      console.log("Calling Pinata API...");
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT.trim()}`,
        },
        body: formData,
      });
      
      console.log("Pinata response received, status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Pinata error details:", errorText);
        throw new Error(`Pinata error: ${res.status} - ${errorText.slice(0, 100)}`);
      }
      
      const resData = await res.json();
      console.log("Pinata upload success, hash:", resData.IpfsHash);
      
      setVoteData(prev => ({ ...prev, imageHash: `ipfs://${resData.IpfsHash}` }));
      setUploadProgress(100);
    } catch (error: any) {
      console.error("Critical error in handleImageUpload:", error);
      alert(`图片上传失败: ${error.message || '未知错误'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-[50] bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Utensils className="text-orange-500 w-8 h-8" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              好吃么
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
              <button 
                onClick={() => setShowRankings(true)}
                className="hover:text-orange-500 flex items-center gap-1.5 transition-colors"
              >
                <TrendingUp size={16} /> <span className="hidden sm:inline">红黑榜</span>
              </button>
              <button 
                onClick={() => setShowUserCenter(true)}
                className="hover:text-orange-500 flex items-center gap-1.5 transition-colors"
              >
                <User size={16} /> <span className="hidden sm:inline">食客中心</span>
              </button>
              <button 
                onClick={() => setShowPublishAd(true)}
                className="hover:text-orange-500 flex items-center gap-1.5 transition-colors"
              >
                <Megaphone size={16} /> <span className="hidden sm:inline">投放广告</span>
              </button>
            </div>
            {isConnected && (
              <div className="hidden md:flex items-center gap-3 mr-4">
                {/* Reputation & Title */}
                <div className="flex items-center gap-2.5 bg-gradient-to-br from-orange-50 to-orange-100/30 px-3 py-2 rounded-xl border border-orange-200/50 shadow-sm">
                  <div className="p-1.5 bg-orange-500 rounded-lg shadow-sm">
                    <Award className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-orange-700 leading-none">{userReputation?.toString() || '0'}</span>
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider leading-none">REP</span>
                    </div>
                    <span className="text-[9px] font-bold text-orange-500/80 leading-none mt-1">
                      {Number(userReputation || 0) >= 100 ? '真相守护者' : 
                       Number(userReputation || 0) >= 10 ? '美食达人' : '初级食客'}
                    </span>
                  </div>
                </div>

                {/* TASTY Balance */}
                <div className="flex items-center gap-2.5 bg-gradient-to-br from-yellow-50 to-yellow-100/30 px-3 py-2 rounded-xl border border-yellow-200/50 shadow-sm">
                  <div className="p-1.5 bg-yellow-400 rounded-lg shadow-sm">
                    <Coins className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-yellow-700 leading-none">
                        {tastyBalance ? Number(formatEther(tastyBalance as bigint)).toFixed(2) : '0.00'}
                      </span>
                      <span className="text-[10px] font-bold text-yellow-600/80 uppercase tracking-wider leading-none">TASTY</span>
                    </div>
                    <span className="text-[9px] font-bold text-yellow-600/60 leading-none mt-1">我的余额</span>
                  </div>
                </div>
              </div>
            )}
            <div className="border-l border-gray-200 pl-4 h-10 flex items-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Toast */}
        {(isPending || isConfirming || isConfirmed || isError) && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 animate-bounce ${
            isError ? 'bg-red-500 text-white' : 
            isConfirmed ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
          }`}>
            {isError ? <AlertTriangle /> : 
             (isPending || isConfirming) ? <Loader2 className="animate-spin" /> : <Award />}
            <div className="max-w-xs">
              <p className="font-bold">
                {isError ? '交易失败' :
                 isPending ? '正在请求签名...' : 
                 isConfirming ? '正在确认交易...' : 
                 '交易成功！'}
              </p>
              {isError && errorMessage && (
                <p className="text-[10px] opacity-90 break-words line-clamp-2">
                  {errorMessage}
                </p>
              )}
              {txHashString && (
                <a 
                  href={`https://testnet.monadvision.com/tx/${txHashString}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs underline opacity-80 block mt-1"
                >
                  {isError ? '查看失败交易' : '在浏览器中查看'}
                </a>
              )}
            </div>
            {isError && (
              <button 
                onClick={() => { setIsError(false); setErrorMessage(null); }}
                className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <PlusCircle className="rotate-45" size={16} />
              </button>
            )}
          </div>
        )}

        {/* 广告栏 */}
        {ads && (ads as any[]).length > 0 && (
          <div className="mt-6 mb-12 relative z-0">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Megaphone size={120} className="-rotate-12" />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/3 aspect-video bg-black/20 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                  {(ads as any[])[(ads as any[]).length - 1].isVideo ? (
                    <video 
                      src={getIpfsUrl((ads as any[])[(ads as any[]).length - 1].contentHash)} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img 
                      src={getIpfsUrl((ads as any[])[(ads as any[]).length - 1].contentHash)} 
                      alt="Advertisement" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
                    <Megaphone size={12} /> 社区赞助
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black mb-2">{(ads as any[])[(ads as any[]).length - 1].title}</h3>
                  <p className="text-white/80 text-sm mb-4 max-w-lg">
                    这是一条由社区成员发布的赞助信息。支持 Web3 美食社区，共同打造最好的点评平台！
                  </p>
                  {(ads as any[])[(ads as any[]).length - 1].link && (
                    <a 
                      href={(ads as any[])[(ads as any[]).length - 1].link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-orange-50 transition-colors shadow-lg active:scale-95"
                    >
                      立即前往 <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">去中心化美食点评</h2>
            <p className="text-gray-600">链上记录，不可篡改，真实的舌尖味道。</p>
          </div>
          <button
            onClick={() => setShowAddMerchant(true)}
            disabled={!isConnected}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusCircle size={20} />
            录入新商家
          </button>
        </div>

        {/* Core Modules Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <TrendingUp className="text-green-500" />, title: "信誉净分", desc: "真实评价堆叠出的红榜" },
            { icon: <Award className="text-orange-500" />, title: "声望加成", desc: "高 REP 用户投票权重更高" },
            { icon: <Coins className="text-yellow-500" />, title: "代币奖励", desc: "点评即挖矿，获取 $TASTY" },
            { icon: <User className="text-blue-500" />, title: "发现者红利", desc: "录入商家享 5% 永续抽成" },
          ].map((item, i) => (
            <div key={i} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">{item.icon}</div>
              <div>
                <h4 className="text-xs font-bold text-gray-800">{item.title}</h4>
                <p className="text-[10px] text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Sorting */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            <Filter size={18} className="text-gray-400 mr-2" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  filterCategory === cat 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setSortBy('newest')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'newest' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Clock size={16} /> 最新录入
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'score' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <TrendingUp size={16} /> 信誉净分
            </button>
          </div>
        </div>

        {/* Rankings Modal */}
        {showRankings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="text-orange-500" /> 商家红黑榜
                </h3>
                <button onClick={() => setShowRankings(false)} className="text-gray-400 hover:text-gray-600">
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Red List (Top 5) */}
                <div className="space-y-4">
                  <h4 className="font-bold text-green-600 flex items-center gap-2 border-b pb-2">
                    <ThumbsUp size={18} /> 红榜 (高分)
                  </h4>
                  {[...(merchants as any[] || [])]
                    .sort((a, b) => (Number(b.upVotes) - Number(b.downVotes)) - (Number(a.upVotes) - Number(a.downVotes)))
                    .slice(0, 5)
                    .map((m, i) => (
                      <div key={m.id.toString()} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-green-300 italic text-xl">#{i+1}</span>
                          <div>
                            <p className="font-bold text-sm">{m.name}</p>
                            <p className="text-[10px] text-gray-500">{m.category}</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-700">+{Number(m.upVotes) - Number(m.downVotes)}</span>
                      </div>
                    ))}
                </div>

                {/* Black List (Bottom 5) */}
                <div className="space-y-4">
                  <h4 className="font-bold text-red-600 flex items-center gap-2 border-b pb-2">
                    <ThumbsDown size={18} /> 黑榜 (避雷)
                  </h4>
                  {[...(merchants as any[] || [])]
                    .sort((a, b) => (Number(a.upVotes) - Number(a.downVotes)) - (Number(b.upVotes) - Number(b.downVotes)))
                    .filter(m => (Number(m.upVotes) - Number(m.downVotes)) < 0)
                    .slice(0, 5)
                    .map((m, i) => (
                      <div key={m.id.toString()} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-red-300 italic text-xl">#{i+1}</span>
                          <div>
                            <p className="font-bold text-sm">{m.name}</p>
                            <p className="text-[10px] text-gray-500">{m.category}</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-700">{Number(m.upVotes) - Number(m.downVotes)}</span>
                      </div>
                    ))}
                  {([...(merchants as any[] || [])].filter(m => (Number(m.upVotes) - Number(m.downVotes)) < 0).length === 0) && (
                    <p className="text-center text-gray-400 py-8 text-sm italic">暂无黑榜商家，大家都表现不错！</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Center Modal */}
        {showUserCenter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <User className="text-orange-500" /> 食客中心
                </h3>
                <button onClick={() => setShowUserCenter(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-6 pb-2">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl text-white shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                      <User size={32} />
                    </div>
                    <div>
                      <p className="font-mono text-xs opacity-80">{address?.slice(0, 10)}...{address?.slice(-8)}</p>
                      <h4 className="text-xl font-black mt-1">
                        {Number(userReputation || 0) >= 100 ? '真相守护者' : 
                         Number(userReputation || 0) >= 10 ? '美食达人' : '初级食客'}
                      </h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                      <p className="text-[10px] uppercase font-bold opacity-60">信誉声望 (REP)</p>
                      <p className="text-2xl font-black">{userReputation?.toString() || '0'}</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                      <p className="text-[10px] uppercase font-bold opacity-60">$TASTY 余额</p>
                      <p className="text-2xl font-black">{tastyBalance ? Number(formatEther(tastyBalance as bigint)).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                </div>

                {/* Redeem Section */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold flex items-center gap-2">
                      <Coins className="text-orange-500" size={18} /> 兑换 MON 测试币
                    </h4>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">奖励池余额</span>
                      <span className={`text-xs font-black ${poolBalance && poolBalance.value > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {poolBalance ? `${Number(poolBalance.formatted).toFixed(4)} MON` : '加载中...'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 bg-orange-50 p-2 rounded border border-orange-100">
                    当前兑换比例: <b>10 $TASTY = 1 MON</b>
                  </p>
                  
                  {poolBalance && poolBalance.value === BigInt(0) && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <p className="text-[10px] leading-relaxed">
                        <b>警告:</b> 当前奖励池余额为 0。您可以继续获得 $TASTY，但暂时无法兑换 MON。请联系管理员或在群里反馈补充资金。
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleRedeem} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">兑换数量 ($TASTY)</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={redeemAmount}
                          onChange={(e) => setRedeemAmount(e.target.value)}
                          placeholder="0.0"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all pr-20"
                        />
                        <button 
                          type="button"
                          onClick={() => setRedeemAmount(formatEther((tastyBalance as bigint) || BigInt(0)))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-500 hover:text-orange-600 bg-orange-50 px-2 py-1 rounded"
                        >
                          全部
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 px-1">
                        预计获得: <b>{redeemAmount ? (Number(redeemAmount) / 10).toFixed(4) : '0.00'} MON</b>
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={!redeemAmount || Number(redeemAmount) <= 0 || isPending || (tastyBalance && parseEther(redeemAmount) > (tastyBalance as bigint))}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:grayscale"
                    >
                      {isPending ? <Loader2 className="animate-spin mx-auto" /> : '立即兑换'}
                    </button>
                  </form>
                </div>

                {/* Rewards Info */}
                <div className="space-y-3">
                  <h5 className="font-bold text-sm text-gray-700">权益与收益</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                      <span className="text-gray-500">投票加成</span>
                      <span className="font-bold text-orange-600">+{Math.floor(Number(userReputation || 0) / 10)}% 权重</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                      <span className="text-gray-500">录入分红</span>
                      <span className="font-bold text-orange-600">5% 永久抽成</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                  <p className="text-xs text-orange-700 leading-relaxed">
                    <strong>提示:</strong> 您的信誉分（REP）越高，在平台上的话语权越大。通过提供带图的“硬核点评”可以快速提升声望。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Merchant Modal */}
        {showAddMerchant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4">录入新商家</h3>
              <form onSubmit={handleAddMerchant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">店名</label>
                  <input
                    required
                    type="text"
                    placeholder="例如: 西贝莜面村"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newMerchant.name}
                    onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">地址/位置</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input
                      required
                      type="text"
                      placeholder="例如: 三里屯太古里店"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      value={newMerchant.location}
                      onChange={(e) => setNewMerchant({ ...newMerchant, location: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-24"
                    value={newMerchant.description}
                    onChange={(e) => setNewMerchant({ ...newMerchant, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">分类</label>
                  <select
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newMerchant.category}
                    onChange={(e) => setNewMerchant({ ...newMerchant, category: e.target.value })}
                  >
                    <option>餐厅</option>
                    <option>小吃</option>
                    <option>甜品</option>
                    <option>饮品</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddMerchant(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    提交录入
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Merchants List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedMerchants.length > 0 ? processedMerchants.map((merchant) => (
            <MerchantCard
              key={merchant.id.toString()}
              merchant={merchant}
              address={address}
              onVote={(id) => setVotingMerchantId(id)}
              onToggleExpand={(id) => setExpandedMerchantId(expandedMerchantId === id ? null : id)}
              isExpanded={expandedMerchantId === Number(merchant.id)}
            />
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <Utensils size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400">暂无符合条件的商家，快去录入第一个吧！</p>
            </div>
          )}
        </div>

        {/* Publish Ad Modal */}
        {showPublishAd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Megaphone className="text-orange-500" /> 投放社区广告
                </h3>
                <button onClick={() => setShowPublishAd(false)} className="text-gray-400 hover:text-gray-600">
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handlePublishAd} className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
                  <div className="flex items-center gap-3 text-orange-800">
                    <Coins size={20} className="text-orange-500" />
                    <div>
                      <p className="text-sm font-bold">发布成本: 20 $TASTY</p>
                      <p className="text-[10px] opacity-70">投放后广告将展示在首页顶部赞助位。</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">广告标题</label>
                  <input
                    required
                    type="text"
                    placeholder="例如：Monad 开发者大会开始报名啦！"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={adData.title}
                    onChange={(e) => setAdData({ ...adData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">媒体素材 (图片或视频)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleAdImageUpload}
                      className="hidden"
                      id="ad-media-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="ad-media-upload"
                      className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        adData.contentHash 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-orange-400'
                      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="animate-spin text-orange-500 mb-2" />
                          <span className="text-xs text-gray-500">上传媒体中 ({uploadProgress}%)...</span>
                        </div>
                      ) : adData.contentHash ? (
                        <div className="flex flex-col items-center text-green-600 p-4">
                          {adData.isVideo ? <Play size={32} className="mb-2" /> : <ImageIcon size={32} className="mb-2" />}
                          <span className="text-xs font-bold">素材已就绪 ({adData.isVideo ? '视频' : '图片'})</span>
                          <span className="text-[10px] text-green-500 opacity-60 truncate max-w-full mt-1">{adData.contentHash}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <ImageIcon size={32} className="mb-2" />
                          <span className="text-xs">点击上传广告素材</span>
                          <span className="text-[9px] mt-1 text-gray-400 opacity-60">支持图片 (JPG/PNG/WEBP) 和视频 (MP4)</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">跳转链接 (可选)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={adData.link}
                    onChange={(e) => setAdData({ ...adData, link: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPublishAd(false)}
                    className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50 font-bold"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || isUploading || !adData.title || !adData.contentHash || (tastyBalance && parseEther('20') > (tastyBalance as bigint))}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                  >
                    {isPending ? <Loader2 className="animate-spin" size={18} /> : <Megaphone size={18} />}
                    {tastyBalance && parseEther('20') > (tastyBalance as bigint) ? '余额不足' : '立即投放'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Voting Modal */}
        {votingMerchantId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-4">发表点评</h3>
              <form onSubmit={handleVote} className="space-y-4">
                <div className="flex gap-4 justify-center mb-6">
                  <button
                    type="button"
                    onClick={() => setVoteData({ ...voteData, isUpvote: true })}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all ${
                      voteData.isUpvote ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-100 grayscale'
                    }`}
                  >
                    <ThumbsUp /> 好吃
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoteData({ ...voteData, isUpvote: false })}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all ${
                      !voteData.isUpvote ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 grayscale'
                    }`}
                  >
                    <ThumbsDown /> 难吃
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">点评内容</label>
                  <textarea
                    required
                    placeholder="说点真实的评价吧..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-24"
                    value={voteData.comment}
                    onChange={(e) => setVoteData({ ...voteData, comment: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">图片证据 (上传到 IPFS)</label>
                  <div className="flex flex-col gap-2">
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          voteData.imageHash 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-orange-400'
                        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUploading ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="animate-spin text-orange-500 mb-2" />
                            <span className="text-xs text-gray-500">正在上传至 IPFS ({uploadProgress}%)...</span>
                          </div>
                        ) : voteData.imageHash ? (
                          <div className="flex flex-col items-center text-green-600">
                            <Award className="mb-2" />
                            <span className="text-xs font-bold">已成功上传</span>
                            <span className="text-[10px] text-green-500 opacity-60 truncate max-w-[200px]">{voteData.imageHash}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-gray-400">
                            <ImageIcon className="mb-2" />
                            <span className="text-xs">点击上传现场照片作为证据</span>
                            <span className="text-[9px] mt-1 text-gray-400 opacity-60">支持 JPG, PNG, WEBP</span>
                          </div>
                        )}
                      </label>
                      {voteData.imageHash && !isUploading && (
                        <button
                          type="button"
                          onClick={() => setVoteData({ ...voteData, imageHash: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <PlusCircle className="rotate-45" size={14} />
                        </button>
                      )}
                    </div>
                    {/* Fallback Manual Input */}
                    <div className="flex items-center gap-2">
                      <div className="h-[1px] bg-gray-100 flex-1"></div>
                      <span className="text-[10px] text-gray-300 font-bold uppercase">或手动输入</span>
                      <div className="h-[1px] bg-gray-100 flex-1"></div>
                    </div>
                    <input
                      type="text"
                      placeholder="ipfs://Qm..."
                      className="w-full px-4 py-2 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-orange-400 outline-none"
                      value={voteData.imageHash}
                      onChange={(e) => setVoteData({ ...voteData, imageHash: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 italic">
                    * 上传证据可将基础权重从 1 提升至 5，并获得更高声望
                  </p>
                </div>

                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-800">预计投票影响力 (权重):</span>
                    <span className="text-lg font-bold text-orange-600">× {estimatedWeight}</span>
                  </div>
                  <p className="text-[10px] text-orange-400 mt-1">
                    基于您的 {userReputation?.toString() || '0'} REP 声望计算。投票后您将获得 {estimatedWeight} $TASTY 奖励。
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setVotingMerchantId(null)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || isUploading || !voteData.comment}
                    className={`flex-1 px-4 py-2 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                      voteData.isUpvote ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        正在请求签名...
                      </>
                    ) : isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        图片上传中...
                      </>
                    ) : (
                      '提交点评'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

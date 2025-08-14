'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useBetProgram, useBetProgramAccount } from './bet-data-access'
import { WalletButton } from '../solana/solana-provider'

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  type: 'message' | 'bet' | 'system'
  betData?: {
    title: string
    amount: number
    outcome: boolean
    odds: string
  }
}

export default function Bet() {
  const { publicKey } = useWallet()
  const { 
    betAccounts, 
    userBetAccounts, 
    processCreateBet, 
    processPlaceBet, 
    processResolveBet, 
    processClaimWinnings 
  } = useBetProgram()

  const [activeRoom, setActiveRoom] = useState<string>('general')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showBetModal, setShowBetModal] = useState(false)
  const [selectedBetPartner, setSelectedBetPartner] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock chat rooms - in real app, this would come from a WebSocket connection
  const chatRooms = [
    { id: 'general', name: '💬 General Chat', users: 234 },
    { id: 'crypto', name: '₿ Crypto Bets', users: 156 },
    { id: 'sports', name: '⚽ Sports Bets', users: 89 },
    { id: 'politics', name: '🗳️ Politics Bets', users: 67 },
    { id: 'entertainment', name: '🎬 Entertainment', users: 45 }
  ]

  // Mock active users - in real app, this would be WebSocket data
  const activeUsers = [
    { wallet: 'crypto_king_2024', status: 'online', winRate: 78 },
    { wallet: 'bet_master_sol', status: 'online', winRate: 65 },
    { wallet: 'prediction_pro', status: 'online', winRate: 82 },
    { wallet: 'solana_trader', status: 'away', winRate: 71 },
    { wallet: 'defi_degen', status: 'online', winRate: 58 }
  ]

  // Bet creation form
  const [quickBetForm, setQuickBetForm] = useState({
    title: '',
    amount: '',
    endTime: '',
    tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Mock chat data - in real app, replace with WebSocket
  useEffect(() => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        user: 'crypto_king_2024',
        message: "Anyone want to bet on BTC hitting $100k by end of month?",
        timestamp: new Date(Date.now() - 300000),
        type: 'message'
      },
      {
        id: '2',
        user: 'bet_master_sol',
        message: "I'll take that bet! What odds are you thinking?",
        timestamp: new Date(Date.now() - 240000),
        type: 'message'
      },
      {
        id: '3',
        user: 'system',
        message: "crypto_king_2024 created a new bet: 'BTC $100k by month end'",
        timestamp: new Date(Date.now() - 180000),
        type: 'system'
      },
      {
        id: '4',
        user: 'bet_master_sol',
        message: "",
        timestamp: new Date(Date.now() - 120000),
        type: 'bet',
        betData: {
          title: 'BTC $100k by month end',
          amount: 100,
          outcome: false,
          odds: '1.85'
        }
      }
    ]
    setChatMessages(mockMessages)
  }, [activeRoom])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !publicKey) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      user: publicKey.toString().slice(0, 8) + '...',
      message: newMessage,
      timestamp: new Date(),
      type: 'message'
    }

    setChatMessages(prev => [...prev, message])
    setNewMessage('')
  }

  const handleQuickBet = async () => {
    if (!publicKey) return

    try {
      await processCreateBet.mutateAsync({
        betTitle: quickBetForm.title,
        betAmount: parseFloat(quickBetForm.amount) * 1_000_000,
        endTime: new Date(quickBetForm.endTime).getTime() / 1000,
        singerPubkey: publicKey,
        tokenMint: new PublicKey(quickBetForm.tokenMint)
      })

      // Add system message about bet creation
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        user: 'system',
        message: `${publicKey.toString().slice(0, 8)}... created a new bet: "${quickBetForm.title}"`,
        timestamp: new Date(),
        type: 'system'
      }

      setChatMessages(prev => [...prev, systemMessage])
      setShowBetModal(false)
      setQuickBetForm({ title: '', amount: '', endTime: '', tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' })
    } catch (error) {
      console.error('Error creating bet:', error)
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-4xl font-bold text-white mb-4">P2P Betting Chat</h1>
          <p className="text-gray-300 text-lg mb-8">Connect your wallet to join the conversation and start betting</p>
          <div className='flex justify-center p-3'>
            <WalletButton />
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <p className="text-gray-400">Real-time chat • Live betting • Solana powered</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex">
      {/* Sidebar - Chat Rooms & Users */}
      <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white mb-1">💬 P2P Betting</h1>
          <p className="text-gray-400 text-sm">Chat • Bet • Win</p>
          <div className='p-2'>
            <WalletButton />
          </div>
        </div>

        {/* Chat Rooms */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Rooms</h3>
            <div className="space-y-1">
              {chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeRoom === room.id
                      ? 'bg-purple-500/20 border border-purple-500/50 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{room.name}</span>
                    <span className="text-xs text-gray-500">{room.users}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Users */}
          <div className="p-4 border-t border-white/10">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Online Users</h3>
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div key={user.wallet} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      user.status === 'online' ? 'bg-green-400' : 'bg-yellow-400'
                    }`} />
                    <span className="text-sm text-gray-300">{user.wallet}</span>
                  </div>
                  <span className="text-xs text-gray-500">{user.winRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Bets Summary */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="text-xs text-gray-400 mb-1">Your Active Bets</div>
            <div className="text-lg font-bold text-white">
              {userBetAccounts.data?.filter(ub => ub.account.user.equals(publicKey)).length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {chatRooms.find(r => r.id === activeRoom)?.name}
            </h2>
            <p className="text-gray-400 text-sm">
              {chatRooms.find(r => r.id === activeRoom)?.users} users online
            </p>
          </div>
          <button
            onClick={() => setShowBetModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 flex items-center space-x-2"
          >
            <span>🎯</span>
            <span>Create Bet</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`${msg.type === 'system' ? 'text-center' : ''}`}>
              {msg.type === 'system' ? (
                <div className="text-gray-400 text-sm italic py-2">
                  {msg.message}
                </div>
              ) : msg.type === 'bet' ? (
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4 max-w-md">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-orange-400 font-medium">{msg.user}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-white font-semibold mb-1">🎯 {msg.betData?.title}</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Amount: {msg.betData?.amount} USDC</span>
                      <span className="text-gray-300">Odds: {msg.betData?.odds}x</span>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button className="flex-1 py-2 bg-green-500/20 border border-green-500 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors">
                        Accept Bet
                      </button>
                      <button className="flex-1 py-2 bg-gray-500/20 border border-gray-500 text-gray-400 rounded text-sm hover:bg-gray-500/30 transition-colors">
                        Counter
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
                    {msg.user.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">{msg.user}</span>
                      <span className="text-xs text-gray-400">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                      <p className="text-gray-200">{msg.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message or betting proposition..."
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-colors pr-12"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                😀
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Live Bets */}
      <div className="w-80 bg-black/20 backdrop-blur-sm border-l border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white mb-1">🔥 Live Bets</h3>
          <p className="text-gray-400 text-sm">Click to join</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {betAccounts.data?.slice(0, 5).map((bet) => {
            const totalPool = bet.account.totalYesAmount.toNumber() + bet.account.totalNoAmount.toNumber()
            const isExpired = Date.now() / 1000 > bet.account.endTime.toNumber()
            
            return (
              <div key={bet.publicKey.toString()} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3 hover:border-purple-500/40 transition-colors cursor-pointer">
                <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                  {bet.account.title}
                </h4>
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Pool: {(totalPool / 1_000_000).toFixed(2)}</span>
                  <span>{bet.account.yesBettors.toNumber() + bet.account.noBettors.toNumber()} bets</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-green-500/10 border border-green-500/30 rounded px-2 py-1 text-center">
                    <div className="text-green-400 text-xs">YES</div>
                    <div className="text-white text-xs font-bold">
                      {totalPool > 0 ? ((totalPool / bet.account.totalYesAmount.toNumber())).toFixed(1) : '0.0'}x
                    </div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-center">
                    <div className="text-red-400 text-xs">NO</div>
                    <div className="text-white text-xs font-bold">
                      {totalPool > 0 ? ((totalPool / bet.account.totalNoAmount.toNumber())).toFixed(1) : '0.0'}x
                    </div>
                  </div>
                </div>
                {bet.account.resolved && (
                  <div className="mt-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      bet.account.outcome ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {bet.account.outcome ? 'YES Won' : 'NO Won'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Bet Modal */}
      {showBetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">🎯 Create Quick Bet</h3>
              <button
                onClick={() => setShowBetModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Betting Proposition
                </label>
                <input
                  type="text"
                  value={quickBetForm.title}
                  onChange={(e) => setQuickBetForm({...quickBetForm, title: e.target.value})}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-colors"
                  placeholder="e.g., Bitcoin will hit $100k by month end"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bet Amount (USDC)
                </label>
                <input
                  type="number"
                  value={quickBetForm.amount}
                  onChange={(e) => setQuickBetForm({...quickBetForm, amount: e.target.value})}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-colors"
                  placeholder="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={quickBetForm.endTime}
                  onChange={(e) => setQuickBetForm({...quickBetForm, endTime: e.target.value})}
                  className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-colors"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBetModal(false)}
                  className="flex-1 py-3 bg-gray-500/20 border border-gray-500 text-gray-400 font-medium rounded-lg hover:bg-gray-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickBet}
                  disabled={processCreateBet.isPending || !quickBetForm.title || !quickBetForm.amount || !quickBetForm.endTime}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50"
                >
                  {processCreateBet.isPending ? 'Creating...' : 'Create & Share'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
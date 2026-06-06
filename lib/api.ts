export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Core fetchers ─────────────────────────────────────────────────────────────

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function apiPost<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function apiDelete<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedItem {
  id: number
  source: string
  title: string
  url: string
  published: string | null
  priority: string
  created_at: string
  summary: string | null
  sentiment: string | null
  symbol: string | null
  image_url: string | null
  comments_count: number | null
}

export interface IndexDigest {
  headline: string
  brief: string
}

export interface MarketDigestResponse {
  market_brief?: string | null
  index_digests?: {
    nifty50?:  IndexDigest
    sensex?:   IndexDigest
    banknifty?: IndexDigest
  }
  top_story: {
    id: number
    title: string
    url: string
    source: string
    created_at: string
    summary: string | null
    impact: string | null
    sentiment: string | null
    key_stocks: string[] | null
  } | null
}

export interface ArticleDetail {
  id: number
  source: string
  title: string
  url: string
  published: string | null
  priority: string
  body: string | null
  created_at: string
  image_url: string | null
  bookmarked: boolean
}

export interface ArticleSummary {
  cached: boolean
  summary: string
  impact: string
  sentiment: string
  action_hint: string
  key_stocks: string[]
  disclaimer: string
}

export interface WatchlistItem {
  symbol: string
  name?: string
  sparkline: number[]
}

export interface StockDetail {
  symbol: string
  name: string
  sector: string | null
  industry: string | null
  related_news: Array<{
    id: number
    title: string
    url: string
    source: string
    created_at: string
    priority: string
  }>
}

export interface StockSearchResult {
  symbol: string
  name: string
  is_nifty50: boolean
}

export interface TrendingStockItem {
  symbol: string
  name: string
}

export interface PollOption {
  text: string
  votes: number
}

export type PostType = 'discussion' | 'news' | 'analysis' | 'meme' | 'question' | 'tip' | 'rant' | 'yolo'

export const POST_TYPE_META: Record<PostType, { label: string; bg: string; text: string }> = {
  discussion: { label: 'Discussion', bg: 'bg-blue-500/15',   text: 'text-blue-500' },
  news:       { label: 'News',       bg: 'bg-orange-500/15', text: 'text-orange-500' },
  analysis:   { label: 'Analysis',   bg: 'bg-purple-500/15', text: 'text-purple-500' },
  meme:       { label: 'Meme',       bg: 'bg-amber-400/15',  text: 'text-amber-500' },
  question:   { label: 'Question',   bg: 'bg-cyan-500/15',   text: 'text-cyan-500' },
  tip:        { label: 'Tip',        bg: 'bg-green-500/15',  text: 'text-green-500' },
  rant:       { label: 'Rant',       bg: 'bg-red-500/15',    text: 'text-red-500' },
  yolo:       { label: 'YOLO',       bg: 'bg-pink-500/15',   text: 'text-pink-500' },
}

export interface CommunityPost {
  id: number
  content: string
  symbol: string | null
  news_id: number | null
  reply_to_id: number | null
  is_bot: boolean
  is_hidden: boolean
  likes_count: number
  comments_count: number
  image_url: string | null
  created_at: string
  author_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_style: string | null
  liked_by_me: boolean
  is_following: boolean
  poll_options: PollOption[] | null
  my_poll_vote: number | null
  author_alpha_score: number | null
  post_type: PostType
}

export interface UploadUrlResponse {
  sas_url: string
  blob_url: string
  expires_in: number
}

export interface UserSearchResult {
  id: number
  username: string
  first_name: string
  last_name: string
  avatar_style: string | null
  is_bot: boolean
  followers_count: number
  posts_count: number
}

export interface TrendingTopic {
  topic: string
  count: number
  source: string
}

export interface PublicUserProfile {
  id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_style: string | null
  posts_count: number
  likes_received: number
  followers_count: number
  following_count: number
  is_following: boolean
}

export interface FollowingUser {
  id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_style: string | null
  posts_count: number
  likes_received: number
  followers_count: number
}

export interface AppNotification {
  id: number
  type: "mention" | "reply" | "poll_vote" | "stock_news" | "stock_event" | "market_open" | "market_close" | "event_reminder"
  title: string
  body: string | null
  read: boolean
  target_type: "article" | "stock" | "community" | "stock_event" | null
  target_id: string | null
  target_tab: "discuss" | "ai-summary" | "overview" | "ai-chat" | null
  source_post_id: number | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NIFTY50_NAMES: Record<string, string> = {
  ADANIENT: 'Adani Enterprises', ADANIPORTS: 'Adani Ports', APOLLOHOSP: 'Apollo Hospitals',
  ASIANPAINT: 'Asian Paints', AXISBANK: 'Axis Bank', 'BAJAJ-AUTO': 'Bajaj Auto',
  BAJFINANCE: 'Bajaj Finance', BAJAJFINSV: 'Bajaj Finserv', BPCL: 'BPCL',
  BHARTIARTL: 'Bharti Airtel', BRITANNIA: 'Britannia', CIPLA: 'Cipla',
  COALINDIA: 'Coal India', DIVISLAB: "Divi's Laboratories", DRREDDY: 'Dr Reddy',
  EICHERMOT: 'Eicher Motors', GRASIM: 'Grasim', HCLTECH: 'HCL Technologies',
  HDFCBANK: 'HDFC Bank', HDFCLIFE: 'HDFC Life', HEROMOTOCO: 'Hero MotoCorp',
  HINDALCO: 'Hindalco', HINDUNILVR: 'Hindustan Unilever', ICICIBANK: 'ICICI Bank',
  ITC: 'ITC', INDUSINDBK: 'IndusInd Bank', INFY: 'Infosys', JSWSTEEL: 'JSW Steel',
  KOTAKBANK: 'Kotak Mahindra Bank', LT: 'Larsen & Toubro', LTIM: 'LTIMindtree',
  'M&M': 'Mahindra & Mahindra', MARUTI: 'Maruti Suzuki', NTPC: 'NTPC',
  NESTLEIND: 'Nestle India', ONGC: 'ONGC', POWERGRID: 'Power Grid',
  RELIANCE: 'Reliance Industries', SBILIFE: 'SBI Life', SHRIRAMFIN: 'Shriram Finance',
  SBIN: 'State Bank of India', SUNPHARMA: 'Sun Pharma', TCS: 'TCS',
  TATACONSUM: 'Tata Consumer', TATAMOTORS: 'Tata Motors', TATASTEEL: 'Tata Steel',
  TECHM: 'Tech Mahindra', TITAN: 'Titan', ULTRACEMCO: 'UltraTech Cement', WIPRO: 'Wipro',
}

const LOGO_COLORS = [
  '#dc2626', '#1e40af', '#0d9488', '#2563eb',
  '#7c3aed', '#f97316', '#1d4ed8', '#059669',
]

export function dicebearUrl(style: string | null | undefined, seed: string): string {
  if (!style || style === "initials") return ""
  // Compound format "style:customSeed" stores a pinned random seed
  if (style.includes(":")) {
    const [s, customSeed] = style.split(":", 2)
    return `https://api.dicebear.com/9.x/${s}/svg?seed=${encodeURIComponent(customSeed)}&size=80`
  }
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=80`
}

export function symbolToName(symbol: string): string {
  return NIFTY50_NAMES[symbol] ?? symbol
}

export function symbolToColor(symbol: string): string {
  let hash = 0
  for (const c of symbol) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length]
}

export function symbolToLogo(symbol: string): string {
  return symbol.length <= 3 ? symbol : symbol.slice(0, 2)
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function sourceToIcon(source: string): string {
  const s = source.toLowerCase()
  if (s.includes('moneycontrol')) return 'MC'
  if (s.includes('economic times') || s === 'et') return 'ET'
  if (s.includes('business standard')) return 'BS'
  if (s.includes('livemint') || s.includes('mint')) return 'LM'
  if (s.includes('cnbc')) return 'CN'
  if (s.includes('bloomberg')) return 'BL'
  if (s.includes('reuters')) return 'RT'
  if (s.includes('zeebiz')) return 'ZB'
  if (s.includes('financialexpress')) return 'FE'
  if (s.includes('hindu')) return 'TH'
  if (s.includes('nse') || s.includes('nseindia')) return 'NSE'
  if (s.includes('bse') || s.includes('bseindia')) return 'BSE'
  if (s.includes('sebi')) return 'SB'
  return source.slice(0, 2).toUpperCase()
}

export function formatPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatChangePct(pct: number | null | undefined): string {
  if (pct == null || isNaN(pct)) return '—'
  return `${Math.abs(pct).toFixed(2)}%`
}

export function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  return n.toLocaleString('en-IN')
}

export interface UserStats {
  articles_interacted: number
  stocks_interacted: number
}

export async function getUserStats(token: string): Promise<UserStats> {
  return apiGet('/api/user/stats', token)
}

export type InteractionHistoryItem =
  | {
      type: "article"
      id: number
      title: string
      source: string
      image_url: string | null
      published: string | null
      article_created_at: string
      interacted_at: string
      symbol: null
    }
  | {
      type: "stock"
      id: null
      title: string | null
      source: null
      image_url: null
      published: null
      article_created_at: null
      interacted_at: string
      symbol: string
    }

export async function getInteractionHistory(token: string): Promise<InteractionHistoryItem[]> {
  const res = await apiGet<{ items: InteractionHistoryItem[] }>('/api/user/interaction-history', token)
  return res.items ?? []
}

// ── News APIs ─────────────────────────────────────────────────────────────────

export async function getNewsFeed(
  token: string,
  tab: 'for_you' | 'my_stocks' | 'all',
  page = 1,
): Promise<FeedItem[]> {
  const res = await apiGet<{ items: FeedItem[] }>(`/api/news/feed?tab=${tab}&page=${page}`, token)
  return res.items ?? []
}

export async function searchArticles(token: string, q: string): Promise<FeedItem[]> {
  const res = await apiGet<{ items: FeedItem[] }>(`/api/news/search?q=${encodeURIComponent(q)}`, token)
  return res.items ?? []
}

export async function getMarketDigest(token: string): Promise<MarketDigestResponse> {
  return apiGet('/api/news/market-digest', token)
}

export async function getArticleDetail(token: string, id: number): Promise<ArticleDetail> {
  return apiGet(`/api/news/${id}`, token)
}

export async function getArticleSummary(token: string, id: number): Promise<ArticleSummary> {
  return apiGet(`/api/news/${id}/summary`, token)
}

export interface ChatHistoryMessage {
  role: "user" | "assistant"
  content: string
  created_at: string
}

export async function getChatHistory(token: string, id: number): Promise<ChatHistoryMessage[]> {
  const res = await apiGet<{ messages: ChatHistoryMessage[] }>(`/api/news/${id}/chat/history`, token)
  return res.messages ?? []
}

export async function toggleBookmark(
  token: string,
  id: number,
): Promise<{ bookmarked: boolean }> {
  return apiPost(`/api/news/${id}/bookmark`, token)
}

// ── Stock APIs ────────────────────────────────────────────────────────────────

export async function getTrendingStocks(token: string): Promise<TrendingStockItem[]> {
  return apiGet('/api/stocks/trending', token)
}

export async function searchStocks(token: string, q: string): Promise<StockSearchResult[]> {
  return apiGet(`/api/stocks/search?q=${encodeURIComponent(q)}`, token)
}

export async function getStockDetail(token: string, symbol: string): Promise<StockDetail> {
  return apiGet(`/api/stocks/${symbol}`, token)
}

// ── Watchlist APIs ────────────────────────────────────────────────────────────

export interface StockEvent {
  id: number
  symbol: string
  event_type: "DIVIDEND" | "BONUS" | "SPLIT" | "RESULTS" | "AGM" | "BOARD_MEETING" | "OTHER"
  event_date: string
  record_date: string | null
  ai_summary: string | null
  created_at: string
}

export async function getWatchlist(token: string): Promise<WatchlistItem[]> {
  return apiGet('/api/watchlist', token)
}

export async function getWatchlistEvents(token: string, days = 30): Promise<StockEvent[]> {
  const res = await apiGet<{ events: StockEvent[] }>(`/api/watchlist/events?days=${days}`, token)
  return res.events ?? []
}

export async function getPortfolioAnalysis(token: string): Promise<{ analysis: string; stock_count: number }> {
  return apiGet('/api/ai/portfolio-analysis', token)
}

export async function addToWatchlist(
  token: string,
  symbol: string,
): Promise<{ symbol: string; added: boolean }> {
  return apiPost('/api/watchlist', token, { symbol })
}

export async function removeFromWatchlist(
  token: string,
  symbol: string,
): Promise<{ symbol: string; removed: boolean }> {
  return apiDelete(`/api/watchlist/${symbol}`, token)
}

// ── Community APIs ────────────────────────────────────────────────────────────

export async function getCommunityPosts(
  token: string,
  tab: 'trending' | 'following' | 'mine' = 'trending',
  page = 1,
  newsId?: number,
  symbol?: string,
): Promise<CommunityPost[]> {
  let url = `/api/community/posts?tab=${tab}&page=${page}`
  if (newsId != null) url += `&news_id=${newsId}`
  if (symbol) url += `&symbol=${encodeURIComponent(symbol)}`
  const res = await apiGet<{ posts: CommunityPost[] }>(url, token)
  return res.posts ?? []
}

export async function getPostById(token: string, postId: number): Promise<CommunityPost> {
  return apiGet<CommunityPost>(`/api/community/posts/${postId}`, token)
}

export async function createPost(
  token: string,
  content: string,
  symbol?: string,
  newsId?: number,
  imageUrl?: string,
  pollOptions?: string[],
  postType: PostType = 'discussion',
): Promise<CommunityPost> {
  return apiPost('/api/community/posts', token, {
    content,
    symbol: symbol ?? null,
    news_id: newsId ?? null,
    image_url: imageUrl ?? null,
    poll_options: pollOptions ?? null,
    post_type: postType,
  })
}

export async function votePoll(
  token: string,
  postId: number,
  optionIdx: number,
): Promise<{ poll_options: PollOption[]; my_poll_vote: number }> {
  return apiPost(`/api/community/posts/${postId}/vote`, token, { option_idx: optionIdx })
}

export async function deletePost(token: string, postId: number): Promise<void> {
  await apiDelete(`/api/community/posts/${postId}`, token)
}

export async function reportPost(token: string, postId: number, reason: string): Promise<void> {
  await apiPost(`/api/community/posts/${postId}/report`, token, { reason })
}

/** Request a pre-signed SAS URL for direct Azure Blob upload. */
export async function requestUploadUrl(
  token: string,
  uploadType: 'post' | 'avatar',
  contentType = 'image/jpeg',
): Promise<UploadUrlResponse> {
  return apiPost('/api/upload/request', token, { upload_type: uploadType, content_type: contentType })
}

/** Upload a file directly to Azure Blob using the SAS URL (never goes through our backend). */
export async function uploadToBlob(sasUrl: string, file: File): Promise<void> {
  const res = await fetch(sasUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
}

export async function submitSupportTicket(
  token: string,
  data: { category: string; subject: string; description: string; imageUrl?: string },
): Promise<void> {
  await apiPost('/api/support/ticket', token, {
    category: data.category,
    subject: data.subject,
    description: data.description,
    image_url: data.imageUrl ?? null,
  })
}

export async function getStockChatHistory(token: string, symbol: string): Promise<ChatHistoryMessage[]> {
  const res = await apiGet<{ messages: ChatHistoryMessage[] }>(`/api/stocks/${encodeURIComponent(symbol)}/chat/history`, token)
  return res.messages ?? []
}

export async function getGlobalAIChatHistory(token: string): Promise<ChatHistoryMessage[]> {
  const res = await apiGet<{ messages: ChatHistoryMessage[] }>('/api/ai/chat/history', token)
  return res.messages ?? []
}

export async function clearGlobalAIChatHistory(token: string): Promise<void> {
  await fetch(`${API_BASE}/api/ai/chat/history`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function searchUsers(token: string, q: string): Promise<UserSearchResult[]> {
  const res = await apiGet<{ users: UserSearchResult[] }>(`/api/users/search?q=${encodeURIComponent(q)}`, token)
  return res.users ?? []
}

export async function likePost(
  token: string,
  id: number,
): Promise<{ liked: boolean; likes_count: number }> {
  return apiPost(`/api/community/posts/${id}/like`, token)
}

export async function unlikePost(
  token: string,
  id: number,
): Promise<{ liked: boolean; likes_count: number }> {
  return apiDelete(`/api/community/posts/${id}/like`, token)
}

export async function getPostComments(token: string, postId: number): Promise<CommunityPost[]> {
  const res = await apiGet<{ posts: CommunityPost[] }>(`/api/community/posts/${postId}/comments`, token)
  return res.posts ?? []
}

export async function searchCommunityPosts(token: string, q: string): Promise<CommunityPost[]> {
  const res = await apiGet<{ posts: CommunityPost[] }>(`/api/community/posts/search?q=${encodeURIComponent(q)}`, token)
  return res.posts ?? []
}

export async function followUser(token: string, userId: number): Promise<{ following: boolean }> {
  return apiPost(`/api/users/${userId}/follow`, token)
}

export async function unfollowUser(token: string, userId: number): Promise<{ following: boolean }> {
  return apiDelete(`/api/users/${userId}/follow`, token)
}

export async function getTrendingTopics(token: string): Promise<TrendingTopic[]> {
  return apiGet('/api/community/trending-topics', token)
}

export async function getFollowing(token: string): Promise<FollowingUser[]> {
  const res = await apiGet<{ users: FollowingUser[] }>('/api/users/following', token)
  return res.users ?? []
}

export async function getMyProfile(token: string): Promise<PublicUserProfile> {
  return apiGet('/api/users/me/profile', token)
}

export async function getUserPublicProfile(token: string, userId: number): Promise<PublicUserProfile> {
  return apiGet(`/api/users/${userId}/profile`, token)
}

export async function getUserPosts(token: string, userId: number, page = 1): Promise<CommunityPost[]> {
  const res = await apiGet<{ posts: CommunityPost[] }>(`/api/users/${userId}/posts?page=${page}`, token)
  return res.posts ?? []
}

// ── Notification APIs ─────────────────────────────────────────────────────────

export async function getNotifications(token: string, limit = 50): Promise<AppNotification[]> {
  return apiGet(`/api/notifications?limit=${limit}`, token)
}

export async function getUnreadCount(token: string): Promise<number> {
  const res = await apiGet<{ count: number }>('/api/notifications/unread-count', token)
  return res.count
}

export async function markNotificationsRead(token: string, ids: number[]): Promise<{ unread_count: number }> {
  return apiPost('/api/notifications/read', token, { ids })
}

export async function markAllNotificationsRead(token: string): Promise<{ unread_count: number }> {
  return apiPost('/api/notifications/read-all', token)
}

// ── Push notification APIs ────────────────────────────────────────────────────

export async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/notifications/vapid-public-key`)
  if (!res.ok) throw new Error('VAPID key unavailable')
  const data = await res.json() as { publicKey: string }
  return data.publicKey
}

export async function subscribePush(token: string, sub: { endpoint: string; auth: string; p256dh: string }): Promise<void> {
  await apiPost('/api/notifications/subscribe', token, sub)
}

export async function unsubscribePush(token: string, endpoint: string, auth: string, p256dh: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/unsubscribe`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, auth, p256dh }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function registerFcmToken(token: string, fcmToken: string): Promise<void> {
  await apiPost('/api/push/register-fcm', token, { fcm_token: fcmToken })
}

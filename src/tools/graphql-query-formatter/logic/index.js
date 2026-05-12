export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from './errors.js'

export {
  MODE,
  DEFAULT_PARAMS,
  VALID_INDENT_WIDTHS,
  GRAPHQL_KEYWORDS,
  GRAPHQL_BUILTIN_TYPES,
  TOKEN_TYPES,
  getIndentString,
  normalizeParams,
  isKeyword,
  isBuiltinType,
} from './constants.js'

export { tokenize, findNextNonWhitespace } from './parser.js'
export { formatGraphQL } from './formatter.js'
export {
  escapeHtml,
  calculateHighlights,
  renderHighlightedHtml,
  getTokenCssClass,
} from './highlights.js'
export {
  MAX_SAFE_INPUT_SIZE as DIFF_MAX_SAFE_INPUT_SIZE,
  OPERATION as DIFF_OPERATION,
  GRANULARITY as DIFF_GRANULARITY,
  computeDiff,
  groupSegmentsByOperation,
} from './diff.js'

const SAMPLE_GRAPHQL = `# 这是一个示例 GraphQL 查询
query GetUserWithPosts($userId: ID!, $limit: Int = 10) {
  user(id: $userId) {
    id
    name
    email
    ...UserDetails
    posts(first: $limit, after: "cursor") {
      edges {
        node {
          id
          title
          content
          createdAt
          ... on PublishedPost {
            publishedAt
            tags
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}

fragment UserDetails on User {
  profile {
    avatarUrl
    bio
  }
  followers {
    totalCount
  }
}

mutation UpdateUserProfile($userId: ID!, $input: UpdateProfileInput!) {
  updateProfile(id: $userId, input: $input) @deprecated(reason: "Use updateUser") {
    user {
      id
      name
    }
    success
  }
}`

const ERROR_SAMPLE = `# 错误示例：未闭合的大括号
query BrokenQuery {
  user(id: "123") {
    id
    name
  # 缺少闭合大括号

# 错误示例：重复的操作名
query GetUser {
  user(id: "1") {
    id
  }
}

query GetUser {
  user(id: "2") {
    name
  }
}`

const COMPRESS_SAMPLE = `# 复杂的博客查询示例
# 包含多个操作、fragment、注释和指令

# 获取用户及其帖子的查询
query GetUserWithPosts(
  $userId: ID!,
  $limit: Int = 10,
  $after: String,
  $includeDrafts: Boolean! = false
) {
  # 查询用户基本信息
  user(id: $userId) {
    id
    name
    email
    ...UserProfile
    # 查询帖子列表（分页）
    posts(
      first: $limit,
      after: $after
    ) {
      edges {
        node {
          id
          title
          slug
          # 只有在请求草稿时才包含
          status @include(if: $includeDrafts)
          # 发布日期
          ...PostMeta
          # 作者信息
          author {
            id
            name
            avatar(size: 48) {
              url
              width
              height
            }
          }
          # 标签
          tags(first: 5) {
            edges {
              node {
                id
                name
                slug
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      totalCount
    }
  }
}

# 用户资料 fragment
fragment UserProfile on User {
  profile {
    avatarUrl
    bio
    website
    location
  }
  # 统计信息
  stats {
    postCount
    followerCount
    followingCount
  }
  # 已弃用的字段
  oldField @deprecated(reason: "Use profile instead")
}

# 帖子元数据 fragment
fragment PostMeta on Post {
  createdAt
  updatedAt
  publishedAt
  # 内联 fragment：已发布帖子特有的字段
  ... on PublishedPost {
    publishDate
    seoTitle
    seoDescription
  }
  # 内联 fragment：草稿帖子特有的字段
  ... on DraftPost {
    saveDate
    lastEditor {
      id
      name
    }
  }
}`

export { SAMPLE_GRAPHQL, ERROR_SAMPLE, COMPRESS_SAMPLE }

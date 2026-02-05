import { createI18n } from 'vue-i18n'

const messages = {
  'zh-CN': {
    app: {
      title: 'Journal',
      subtitle: 'Supabase 版',
      nav: {
        home: '主页',
        accepted: '已发表',
        inReview: '在审',
        submit: '投稿',
      },
      anonymous: '未登录',
    },
    home: {
      title: 'Journal',
      subtitle: '投稿概览与最新动态',
      recent: '近期活动',
      updatedNow: '更新于刚刚',
      empty: '暂无动态',
    },
    list: {
      acceptedTitle: '已发表',
      acceptedSubtitle: '仓库风格列表展示已发表文章。',
      inReviewTitle: '正在审稿',
      inReviewSubtitle: '展示审稿进展、槽位与讨论。',
      emptyAccepted: '暂无已发表文章',
      emptyInReview: '暂无在审稿件',
      updatedAt: '更新于 {date}',
      tagAccepted: '已发表',
      statusInReview: '在审',
      comments: '评论',
      reviews: '审稿意见',
      slots: '槽位',
    },
  },
  'en-US': {
    app: {
      title: 'Journal',
      subtitle: 'Supabase Edition',
      nav: {
        home: 'Home',
        accepted: 'Accepted',
        inReview: 'In Review',
        submit: 'Submit',
      },
      anonymous: 'Guest',
    },
    home: {
      title: 'Journal',
      subtitle: 'Overview & recent activity',
      recent: 'Recent activity',
      updatedNow: 'Updated just now',
      empty: 'No activity',
    },
    list: {
      acceptedTitle: 'Accepted',
      acceptedSubtitle: 'Repository-style list of accepted papers.',
      inReviewTitle: 'In Review',
      inReviewSubtitle: 'Review progress, slots, and discussions.',
      emptyAccepted: 'No accepted papers',
      emptyInReview: 'No in-review submissions',
      updatedAt: 'Updated {date}',
      tagAccepted: 'Accepted',
      statusInReview: 'In review',
      comments: 'Comments',
      reviews: 'Reviews',
      slots: 'Slots',
    },
  },
}

export const i18n = createI18n({
  legacy: true,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages,
})

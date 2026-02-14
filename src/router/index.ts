import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabaseClient'

import HomePage from '../pages/HomePage.vue'
import AcceptedListPage from '../pages/AcceptedListPage.vue'
import InReviewListPage from '../pages/InReviewListPage.vue'
import SubmissionDetailPage from '../pages/SubmissionDetailPage.vue'
import SubmissionCommentsPage from '../pages/SubmissionCommentsPage.vue'
import SubmissionReviewOpinionsPage from '../pages/SubmissionReviewOpinionsPage.vue'
import SubmissionCreatePage from '../pages/SubmissionCreatePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import UserCenterPage from '../pages/UserCenterPage.vue'
import GuidelinesPage from '../pages/GuidelinesPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import SearchPage from '../pages/SearchPage.vue'
import OpenReviewPage from '../pages/OpenReviewPage.vue'
import PrivacyPage from '../pages/PrivacyPage.vue'
import TermsPage from '../pages/TermsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/accepted', name: 'accepted', component: AcceptedListPage },
    { path: '/in-review', name: 'in-review', component: InReviewListPage },
    { path: '/submissions/:id', name: 'submission-detail', component: SubmissionDetailPage },
    {
      path: '/submit',
      name: 'submission-create',
      component: SubmissionCreatePage,
      meta: { requiresAuth: true },
    },
    {
      path: '/submissions/:id/comments',
      name: 'submission-comments',
      component: SubmissionCommentsPage,
    },
    {
      path: '/submissions/:id/review-opinions',
      name: 'submission-review-opinions',
      component: SubmissionReviewOpinionsPage,
    },
    { path: '/search', name: 'search', component: SearchPage },
    { path: '/guidelines', name: 'guidelines', component: GuidelinesPage },
    { path: '/about', name: 'about', component: AboutPage },
    { path: '/open-review', name: 'open-review', component: OpenReviewPage },
    { path: '/privacy', name: 'privacy', component: PrivacyPage },
    { path: '/terms', name: 'terms', component: TermsPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/me', name: 'me', component: UserCenterPage, meta: { requiresAuth: true } },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const { data } = await supabase.auth.getSession()
  if (data.session) return true

  return { path: '/login', query: { redirect: to.fullPath } }
})

export default router

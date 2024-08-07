import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

let router = new Router({
  routes: [
    {
      path: '/',
      name: 'page1',
      component: () => import('@/views/page1.vue')
    }
  ]
})

export default router
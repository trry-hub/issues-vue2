import Vue from 'vue'
import Router from 'vue-router'

import Layout from '@/layout'

Vue.use(Router);

let router = new Router({
  routes: [
    {
      path: '/page1',
      name: 'page1',
      component: Layout,
      redirect: '/page1/list',
      children: [{
        path: 'list',
        name: 'page1',
        redirect: '/page1/list/child-page',
        component: () => import('../views/page1.vue'),
        children: [{
          path: '',
          name: 'child-page',
          component: () => import('../views/child-page.vue')
        }]
      },
      {
        // children 中有 / 的将导致缓存失效
        path: '/page2',
        name: 'page2',
        component: () => import('../views/page2.vue')
      }
      ]
    }, {
      path: '/page2',
      name: 'page2',
      component: () => import('../views/page2.vue')
    }
  ]
})

export default router
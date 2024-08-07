import Vue from 'vue'
import Router from 'vue-router'


Vue.use(Router);

let router = new Router({
  routes: [
    {
      path: '/page1',
      name: 'page1',
      redirect: '/page1/child-page',
      component: () => import('../views/page1.vue'),
      children: [{
        path: 'child-page',
        name: 'child-page',
        component: () => import('../views/child-page.vue')
      }]
    }, {
      path: '/page2',
      name: 'page2',
      component: () => import('../views/page2.vue')
    }
  ]
})

export default router
<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
    <router-link to="/page1">page1</router-link>
    <router-link to="/page2">page2</router-link>
    <EmptyLayout/>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import EmptyLayout from '@/layout/EmptyLayout.vue'

export default {
  name: 'App',
  components: {
    HelloWorld,
    EmptyLayout
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

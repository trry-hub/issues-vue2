<template>
  <div>
    <div class="page1">
      page1
      <input v-model="value" type="text">
    </div>

    <router-link to="/page1/child-page">child-page</router-link>
    <EmptyLayout />
  </div>
</template>

<script>
import EmptyLayout from '@/layout/EmptyLayout.vue'
export default {
  name: 'page1',
  components: {
    EmptyLayout
  },
  props: {

  },
  data() {
    return {
      value: 'page1'
    }
  },
  computed: {

  },
  watch: {

  },
  created() {

  },
  mounted() {

  },
  methods: {

  }
}
</script>

<style scoped lang="scss">
// scss
.page1 {}
</style>

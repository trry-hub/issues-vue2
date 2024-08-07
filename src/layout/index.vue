<template>
  <div class="main">
    <div class="content">
      <transition name="fade-transform" mode="out-in">
        <EmptyLayout />
      </transition>
    </div>
    <Footer />
  </div>
</template>

<script>
import EmptyLayout from '@/layout/EmptyLayout.vue'
import Footer from '@/components/Footer.vue'
export default {
  name: 'Layout',
  components: {
    EmptyLayout,
    Footer
  }
}
</script>

<style scoped lang="scss">
// scss
.main {
  height: 100vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  .content {
    flex: 1;
    overflow: hidden;
  }
  .fade-transform-leave-active,
  .fade-transform-enter-active {
    transition: all 0.2s;
  }
  .fade-transform-enter {
    opacity: 0;
    transform: translateX(0);
  }
  .fade-transform-leave-to {
    opacity: 0;
    transform: translateX(0);
  }
}
</style>

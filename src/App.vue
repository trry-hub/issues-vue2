<template>
  <div class="swiper-container">
    <div class="swiper-wrapper">
      <div class="swiper-slide" v-for="(slide, index) in slides" :key="index">
        <div><img :src="require(`@/assets/images/${slide.image}`)" /></div>
      </div>
    </div>
  </div>
</template>

<script>
import Swiper from 'swiper';
import { EffectCards, Autoplay } from 'swiper/modules'
import 'swiper/css';
import 'swiper/css/effect-cards';

export default {
  name: "App",
  data() {
    return {
      slides: [
        { image: "pg2.png" },
        { image: "pg3.png" },
        { image: "pg1.png" },
        { image: "pg4.png" },
        { image: "pg2.png" },
        { image: "pg3.png" },
      ],
    };
  },
  mounted() {
    let cards = {
      effect: "cards",
      resistanceRatio: 0,
      loop: true,
      autoplay: true,
      cardsEffect: {
        slideShadows: false,
        rotate: false,
      },
    };
    Swiper.use([EffectCards, Autoplay]);
    new Swiper(".swiper-container", cards);
  }
};
</script>

<style scoped>
.swiper-container {
  width: 40%;
  margin: 0 auto;
}

.swiper-slide {
  text-align: center;
}

.swiper-slide div img {
  width: 100%;
}
</style>

<template>
    <div class="image-gallery">
        <el-image style="width: 80%; height: auto;margin: 0 auto;" :src="url" :zoom-rate="1.2" :max-scale="7" :min-scale="0.2"
            :preview-src-list="srcList" show-progress :initial-index="4" fit="cover" />
    </div>
</template>

<script setup>
// 使用导入方式引用图片
import image1 from '@m/01.png'
import image2 from '@m/02.png'
import image3 from '@m/03.png'
import image4 from '@m/04.png'
import image5 from '@m/05.png'
import image6 from '@m/06.png'
const url = image1
const srcList = [
  image1,
  image2,
  image3,
  image4,
  image5,
  image6,
]

</script>

<style scoped>
.image-gallery {
    width: 100%;
    margin: 0 auto;
    padding: 20px;
    max-height: 100vh;
    overflow: auto;
    text-align: center;
}
</style>
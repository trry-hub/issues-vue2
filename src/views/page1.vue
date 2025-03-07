<template>
  <div v-cloak>
    <div class="Camera-wrapper" :style="{ width: width + 7 + 'px', height: height + 7 + 'px' }">
      <div class="canvas-wrapper" :style="{ width: width + 'px', height: height + 'px' }">
        <video
          ref="video"
          :width="width"
          :height="height"
          webkit-playsinline="true"
          playsinline="true"
          preload
          autoplay
          loop
          muted
          style="transform: scale(-1, 1);"
        />
        <canvas
          ref="canvas"
          :width="width"
          :height="height"
          style="display: none;"
        />
      </div>
    </div>

    <!-- 动作按钮组 -->
    <div class="action-buttons">
      <!-- 自动模式按钮 -->
      <van-button
        :type="isAutoMode ? 'primary' : 'default'"
        :disabled="isAutoMode"
        @click="startAutoMode"
      >
        自动模式
      </van-button>

      <!-- 颜色验证按钮 -->
      <van-button
        :type="isColorTesting ? 'primary' : 'default'"
        :disabled="isColorTesting || isAutoMode"
        @click="startColorValidation"
      >
        颜色验证
      </van-button>

      <!-- 单个动作按钮 -->
      <van-button
        v-for="action in actionList"
        :key="action.value"
        :type="!isAutoMode && currentDetectAction === action.value ? 'primary' : 'default'"
        :disabled="isAutoMode || isColorTesting"
        @click="handleActionClick(action)"
      >
        {{ action.name }}
      </van-button>
    </div>

    <!-- 当前动作提示 -->
    <div v-if="isAutoMode" class="current-action">
      <p>当前动作：{{ autoActionList[currentAutoIndex]?.name }}</p>
      <p>进度：{{ currentAutoIndex + 1 }}/{{ autoActionList.length }}</p>
    </div>

    <!-- 添加加载状态遮罩 -->
    <div v-if="isLoading" class="loading-mask">
      <div class="loading-content" @click="loadFailed && openUserMedia()">
        <van-loading v-if="!loadFailed" type="spinner" color="#1989fa" />
        <span>{{ loadingText }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'

export default {
  name: 'RiskFaceVerify',
  data() {
    return {
      width: 280,
      height: 280,
      isCameraOpen: true,
      inProgress: true,
      mediaStreamTrack: null,
      ModelLoading: false,
      detector: null,
      rafId: null,
      currentDetectAction: null,
      isAutoMode: false,
      autoActionList: [],
      currentAutoIndex: 0,
      actionList: [
        { name: '张嘴', value: 2 },
        { name: '眨眼', value: 3 },
        { name: '左转头', value: 4 },
        { name: '右转头', value: 5 },
        { name: '抬头', value: 6 },
        { name: '低头', value: 7 }
      ],
      lastActionTime: 0,
      actionCooldown: 2000,
      debugMode: false,
      modelReady: false,
      lookingDownCounter: 0,
      isLoading: true,
      loadingText: '模型加载中...',
      loadFailed: false,
      winkState: null,
      isColorTesting: false,
      colorTestResult: false,
      colorOverlay: null
    }
  },

  beforeDestroy() {
    if (this.mediaStreamTrack) {
      this.mediaStreamTrack.getTracks().forEach(track => {
        track.stop()
      })
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
    this.removeColorOverlay()
    if (this.isColorTesting) {
      this.isColorTesting = false
    }
  },

  async mounted() {
    this.debugMode = true
    await this.openUserMedia()
  },

  methods: {
    createDetector() {
      return new Promise((resolve, reject) => {
        if (this.ModelLoading) {
          reject('模型正在加载中')
          return
        }

        this.ModelLoading = true
        this.loadingText = '正在加载模型...'

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
        const detectorConfig = {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
          maxFaces: 1,
          refineLandmarks: false
        }

        faceLandmarksDetection.createDetector(model, detectorConfig)
          .then(detector => {
            this.detector = detector
            this.modelReady = true
            resolve(this.detector)
          })
          .catch(error => {
            console.error('模型加载:', error)
            this.loadFailed = true
            this.loadingText = '加载失败，点击重试'
            reject(error)
          })
          .finally(() => {
            this.ModelLoading = false
          })
      })
    },

    async openUserMedia() {
      this.isLoading = true
      this.loadFailed = false
      this.loadingText = '正在初始化摄像头...'

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: this.width,
            height: this.height,
            facingMode: 'user'
          }
        })

        this.mediaStreamTrack = stream
        const video = this.$refs.video
        video.srcObject = stream
        video.style.transform = 'scale(-1, 1)'

        await new Promise(resolve => {
          video.onloadedmetadata = () => {
            video.play()
            resolve()
          }
        })

        this.loadingText = '正在加载模型...'
        await this.createDetector()

        if (this.detector) {
          this.renderPrediction()
          this.isCameraOpen = true
          this.isLoading = false
          this.$toast({
            message: '初始化成功',
            duration: 2000
          })
        }
      } catch (error) {
        console.error('初始化错误:', error)
        this.loadFailed = true
        this.loadingText = '初始化失败，点击重试'
        this.$toast({
          message: '初始化失败，请确保允许使用摄像头',
          duration: 2000
        })
      }
    },

    startAutoMode() {
      if (!this.modelReady) {
        this.$toast('请等待模型加载完成')
        return
      }
      this.isAutoMode = true
      this.currentAutoIndex = 0
      this.lastActionTime = 0
      this.autoActionList = [...this.actionList].sort(() => Math.random() - 0.5)
      this.currentDetectAction = this.autoActionList[0].value
      this.$toast({
        message: `请${this.autoActionList[0].name}`,
        duration: 2000
      })
    },

    handleActionClick(action) {
      if (this.isAutoMode || this.isColorTesting) return

      this.currentDetectAction = action.value
      this.$toast({
        message: `请${action.name}`,
        duration: 2000
      })
    },

    async renderPrediction() {
      const video = this.$refs.video
      const canvas = this.$refs.canvas
      const ctx = canvas.getContext('2d')

      try {
        this.rafId = requestAnimationFrame(async() => {
          const predictions = await this.detector.estimateFaces(video, {
            flipHorizontal: false,
            staticImageMode: false,
            predictIrises: false
          })

          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (predictions.length > 0) {
            const face = predictions[0]

            // 只在需要时执行动作检测
            if (this.currentDetectAction) {
              switch (this.currentDetectAction) {
                case 2:
                  this.isOpenMouth(face, ctx)
                  break
                case 3:
                  this.isWink(face, ctx)
                  break
                case 4:
                  this.isLookingLeft(face, ctx)
                  break
                case 5:
                  this.isLookingRight(face, ctx)
                  break
                case 6:
                  this.isLookingUp(face, ctx)
                  break
                case 7:
                  this.isLookingDown(face, ctx)
                  break
              }
            }
          }

          // 继续渲染循环
          if (this.isCameraOpen) {
            this.renderPrediction()
          }
        })
      } catch (error) {
        console.error('渲染错:', error)
        if (this.isCameraOpen) {
          this.renderPrediction() // 发生错误时继续尝试渲染
        }
      }
    },

    // 眨眼检测
    isWink(face) {
      if (this.currentDetectAction !== 3) return

      // 获取
      const leftEye = face.keypoints[33] // 左眼角
      const rightEye = face.keypoints[263] // 右眼角
      const nose = face.keypoints[1] // 鼻尖
      const chin = face.keypoints[152] // 下巴
      const foreHead = face.keypoints[10] // 前额

      // 1. 检查水平方向的正脸（左右转头）
      const leftEyeToNose = Math.abs(leftEye.x - nose.x)
      const rightEyeToNose = Math.abs(rightEye.x - nose.x)
      const eyeDistanceDiff = Math.abs(leftEyeToNose - rightEyeToNose)
      const eyeDistance = Math.abs(rightEye.x - leftEye.x)
      const horizontalRatio = eyeDistanceDiff / eyeDistance

      // 2. 检查抬头角度（使用前额-鼻子-下巴的角度）
      const foreHeadToNose = Math.abs(foreHead.y - nose.y)
      const noseToChin = Math.abs(nose.y - chin.y)
      const verticalRatio = foreHeadToNose / noseToChin

      if (this.debugMode) {
        console.log('姿态检测:', {
          horizontalRatio,
          verticalRatio,
          foreHeadToNose,
          noseToChin
        })
      }

      // 调整阈值：进一步放松抬头限制
      const HORIZONTAL_THRESHOLD = 0.45 // 保持水平方向阈值不变
      const VERTICAL_THRESHOLD_MIN = 0.75 // 保持最小阈值不变
      const VERTICAL_THRESHOLD_MAX = 2.0 // 显著提高最大阈值，大幅放松抬头限制

      if (
        horizontalRatio > HORIZONTAL_THRESHOLD ||
        verticalRatio < VERTICAL_THRESHOLD_MIN ||
        verticalRatio > VERTICAL_THRESHOLD_MAX
      ) {
        if (this.debugMode) {
          console.log('请保持头部正直，不要过度抬头或低头')
        }
        return
      }

      // 眨眼检测逻辑保持不变
      const leftEyeUpper1 = face.keypoints[159]
      const leftEyeLower1 = face.keypoints[145]
      const rightEyeUpper1 = face.keypoints[386]
      const rightEyeLower1 = face.keypoints[374]

      const leftEyeDistance = Math.abs(leftEyeUpper1.y - leftEyeLower1.y)
      const rightEyeDistance = Math.abs(rightEyeUpper1.y - rightEyeLower1.y)

      const leftEyeWidth = Math.abs(face.keypoints[33].x - face.keypoints[133].x)
      const rightEyeWidth = Math.abs(face.keypoints[362].x - face.keypoints[263].x)

      const leftEyeRatio = leftEyeDistance / leftEyeWidth
      const rightEyeRatio = rightEyeDistance / rightEyeWidth

      if (this.debugMode) {
        console.log('眨眼检测:', {
          leftEyeRatio,
          rightEyeRatio
        })
      }

      if (!this.winkState) {
        this.winkState = {
          isWinking: false,
          lastWinkTime: 0
        }
      }

      const now = Date.now()
      const WINK_THRESHOLD = 0.25

      if (
        (leftEyeRatio < WINK_THRESHOLD || rightEyeRatio < WINK_THRESHOLD) &&
        now - this.winkState.lastWinkTime > 500
      ) {
        if (!this.winkState.isWinking) {
          this.triggerAction(3)
          this.winkState.isWinking = true
          this.winkState.lastWinkTime = now
        }
      } else if (leftEyeRatio > WINK_THRESHOLD && rightEyeRatio > WINK_THRESHOLD) {
        this.winkState.isWinking = false
      }
    },

    // 左右转头检测
    isShakingHisHead(face) {
      if (this.currentDetectAction !== 4 && this.currentDetectAction !== 5) return

      const nose = face.keypoints[1]
      const leftEar = face.keypoints[234]
      const rightEar = face.keypoints[454]

      const leftDist = Math.abs(nose.x - leftEar.x)
      const rightDist = Math.abs(nose.x - rightEar.x)
      const ratio = leftDist / rightDist

      if (this.debugMode) {
        console.log('转头比例:', ratio)
      }

      if (this.currentDetectAction === 4 && ratio > 1.5) {
        this.triggerAction(4)
      }
      if (this.currentDetectAction === 5 && ratio < 0.6) {
        this.triggerAction(5)
      }
    },

    // 抬头检测
    isLookingUp(face) {
      if (this.currentDetectAction !== 6) return

      // 使用眼睛和嘴巴的位置来判断抬头
      const leftEye = face.keypoints[159] // 左眼中心
      const rightEye = face.keypoints[386] // 右眼中心
      const mouth = face.keypoints[0] // 嘴巴中心

      // 计算眼睛和嘴巴的垂直距离比例
      const eyeY = (leftEye.y + rightEye.y) / 2
      const ratio = (mouth.y - eyeY) / this.height

      if (this.debugMode) {
        console.log('抬头比例:', ratio)
      }

      // 调整阈值：从 0.15 改为 0.12，进一步降低灵敏度
      if (ratio < 0.12) {
        this.triggerAction(6)
      }
    },

    // 低头检测
    isLookingDown(face) {
      if (this.currentDetectAction !== 7) return

      // 获取关键点
      const nose = face.keypoints[1] // 鼻尖
      const leftEye = face.keypoints[33] // 左眼
      const rightEye = face.keypoints[263] // 右眼角
      const chin = face.keypoints[152] // 下巴

      // 计算眼睛中点的y坐标
      const eyesCenterY = (leftEye.y + rightEye.y) / 2

      // 计算鼻子到眼睛中点的垂直距离
      const noseToEyesDistance = nose.y - eyesCenterY

      // 计算下巴到眼睛的垂直距离
      const chinToEyesDistance = chin.y - eyesCenterY

      // 计算低头比率
      const lookDownRatio = noseToEyesDistance / chinToEyesDistance

      if (this.debugMode) {
        console.log('低头检测:', {
          noseToEyesDistance,
          chinToEyesDistance,
          lookDownRatio
        })
      }

      // 初始化低头状态
      if (!this.lookDownState) {
        this.lookDownState = {
          isLookingDown: false
        }
      }

      const LOOK_DOWN_THRESHOLD = 0.45 // 增加阈值，使其需要更明显的低头动作

      if (lookDownRatio > LOOK_DOWN_THRESHOLD) {
        if (!this.lookDownState.isLookingDown) {
          this.triggerAction(7)
          this.lookDownState.isLookingDown = true
        }
      } else {
        this.lookDownState.isLookingDown = false
      }
    },

    // 张嘴检测
    isOpenMouth(face) {
      if (this.currentDetectAction !== 2) return

      // 获取关键点
      const upperLip = face.keypoints[13] // 上嘴唇
      const lowerLip = face.keypoints[14] // 下嘴唇
      const leftMouth = face.keypoints[78] // 嘴角左
      const rightMouth = face.keypoints[308] // 嘴角右

      // 计算嘴巴开合程度
      const mouthHeight = Math.abs(upperLip.y - lowerLip.y)
      const mouthWidth = Math.abs(leftMouth.x - rightMouth.x)
      const mouthRatio = mouthHeight / mouthWidth

      if (this.debugMode) {
        console.log('张嘴检测:', {
          mouthHeight,
          mouthWidth,
          mouthRatio
        })
      }

      // 调整阈值：放宽张嘴判定
      const MOUTH_OPEN_THRESHOLD = 0.35 // 从 0.4 降低到 0.35，放宽张嘴要求

      if (mouthRatio > MOUTH_OPEN_THRESHOLD) {
        this.triggerAction(2)
      }
    },

    // 辅助方法：计算眼睛开合比例
    getEyeOpenRatio(keypoints, indexes) {
      let top = 0
      let bottom = 0
      let left = 0
      let right = 0

      indexes.forEach(index => {
        const point = keypoints[index]
        if (!top || point.y < top) top = point.y
        if (!bottom || point.y > bottom) bottom = point.y
        if (!left || point.x < left) left = point.x
        if (!right || point.x > right) right = point.x
      })

      return (bottom - top) / (right - left)
    },

    // 辅助方法：计算点集的平均位置
    getAveragePosition(keypoints, indexes) {
      let sumX = 0
      let sumY = 0
      indexes.forEach(index => {
        sumX += keypoints[index].x
        sumY += keypoints[index].y
      })
      return {
        x: sumX / indexes.length,
        y: sumY / indexes.length
      }
    },

    // 修改 triggerAction 方法
    triggerAction(actionValue) {
      const now = Date.now()
      if (now - this.lastActionTime < this.actionCooldown) {
        return // 如果在冷却时间内，不触发动作
      }

      if (this.currentDetectAction === actionValue) {
        this.lastActionTime = now

        if (this.isAutoMode) {
          this.currentAutoIndex++
          if (this.currentAutoIndex >= this.autoActionList.length) {
            this.$toast({
              message: '恭喜！所有动作已完成！',
              duration: 2000,
              icon: '' // 移除图标
            })
            this.isAutoMode = false
            this.currentDetectAction = null
          } else {
            this.currentDetectAction = this.autoActionList[this.currentAutoIndex].value
            this.$toast({
              message: `请${this.autoActionList[this.currentAutoIndex].name}`,
              duration: 2000,
              icon: '' // 移除图标
            })
          }
        } else {
          this.$toast({
            message: '动作检测成功！',
            duration: 2000,
            icon: '' // 移除图标
          })
        }
      }
    },

    // 左转头检测
    isLookingLeft(face) {
      if (this.currentDetectAction !== 4) return

      const leftEye = face.keypoints[33] // 左眼角
      const rightEye = face.keypoints[263] // 右眼角
      const nose = face.keypoints[1] // 鼻尖

      const leftEyeToNose = Math.abs(leftEye.x - nose.x)
      const rightEyeToNose = Math.abs(rightEye.x - nose.x)

      const eyeNoseDiff = leftEyeToNose - rightEyeToNose

      if (this.debugMode) {
        console.log('左转头检测:', {
          leftEyeToNose,
          rightEyeToNose,
          eyeNoseDiff
        })
      }

      if (!this.lookLeftState) {
        this.lookLeftState = {
          isLookingLeft: false
        }
      }

      const LOOK_LEFT_THRESHOLD = 50 // 调整到 50

      if (eyeNoseDiff > LOOK_LEFT_THRESHOLD) {
        if (!this.lookLeftState.isLookingLeft) {
          this.triggerAction(4)
          this.lookLeftState.isLookingLeft = true
        }
      } else {
        this.lookLeftState.isLookingLeft = false
      }
    },

    // 右转头检测
    isLookingRight(face) {
      if (this.currentDetectAction !== 5) return

      const leftEye = face.keypoints[33] // 左眼角
      const rightEye = face.keypoints[263] // 右眼角
      const nose = face.keypoints[1] // 鼻尖

      const leftEyeToNose = Math.abs(leftEye.x - nose.x)
      const rightEyeToNose = Math.abs(rightEye.x - nose.x)

      const eyeNoseDiff = rightEyeToNose - leftEyeToNose

      if (this.debugMode) {
        console.log('右转头检测:', {
          leftEyeToNose,
          rightEyeToNose,
          eyeNoseDiff
        })
      }

      if (!this.lookRightState) {
        this.lookRightState = {
          isLookingRight: false
        }
      }

      const LOOK_RIGHT_THRESHOLD = 50 // 调整到 50

      if (eyeNoseDiff > LOOK_RIGHT_THRESHOLD) {
        if (!this.lookRightState.isLookingRight) {
          this.triggerAction(5)
          this.lookRightState.isLookingRight = true
        }
      } else {
        this.lookRightState.isLookingRight = false
      }
    },

    // 修改自动模式的动作验证成功处理
    async handleActionSuccess() {
      if (!this.isAutoMode) return

      this.currentAutoIndex++

      if (this.currentAutoIndex < this.autoActionList.length) {
        // 还有下一个动作
        this.currentDetectAction = this.autoActionList[this.currentAutoIndex].value
        this.$toast({
          message: `请${this.autoActionList[this.currentAutoIndex].name}`,
          duration: 2000
        })
      } else {
        // 所有动作完成，开始颜色验证程
        this.currentDetectAction = null

        // 显示完成提示
        await this.$toast({
          message: '恭喜！所有动作已完成！',
          duration: 1500
        })

        // 等待提示消失后开始颜色验证
        setTimeout(async() => {
          await this.startColorValidation()
        }, 1500)
      }
    },

    // 颜色验证流程
    async startColorValidation() {
      if (this.isColorTesting) return

      this.isColorTesting = true
      this.currentDetectAction = null // 清除当前动作检测

      this.$toast({
        message: '即将进行活体检测，请保持面部在画面中',
        duration: 1500
      })

      // 等待提示显示完
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 执行颜色验证
      const isValid = await this.performColorValidation()

      if (isValid) {
        this.$toast({
          message: '验证通过！',
          duration: 2000
        })
        this.$emit('verify-success')
      } else {
        this.$toast({
          message: '验证失败，请使用真验证',
          duration: 2000
        })
      }

      // 重置状态
      this.isColorTesting = false
    },

    // 重置自动模式
    resetAutoMode() {
      this.isAutoMode = false
      this.currentAutoIndex = 0
      this.currentDetectAction = null
      this.autoActionList = []
    },

    // 修改颜色验证执行方法
    async performColorValidation() {
      if (!this.modelReady) {
        this.$toast('请等待模型加载完成')
        return
      }

      this.isColorTesting = true
      this.createColorOverlay()

      const testColors = [
        '#FF0000', // 红色
        '#00FF00', // 绿色
        '#0000FF' // 蓝色
      ]

      const results = []
      const shuffledColors = testColors.sort(() => Math.random() - 0.5)

      try {
        for (let i = 0; i < shuffledColors.length; i++) {
          const color = shuffledColors[i]
          this.colorOverlay.style.backgroundColor = color

          // 等待颜色稳定
          await new Promise(resolve => setTimeout(resolve, 800))

          // 进行多次采样
          const sampleResults = []
          let validSamples = 0

          for (let j = 0; j < 5; j++) {
            const faces = await this.detector.estimateFaces(this.$refs.video)
            if (!faces || faces.length === 0) continue

            const face = faces[0]
            const isFrontalFace = await this.checkFrontalFace(face)

            if (isFrontalFace) {
              validSamples++
              const result = await this.analyzeColorReflection(color)
              if (result) sampleResults.push(result)
            }

            await new Promise(resolve => setTimeout(resolve, 100))
          }

          // 只要有足够的有效样本就进行判断
          const bestResult = validSamples >= 3 && sampleResults.length >= 2
          results.push(bestResult)

          if (this.debugMode) {
            console.log(`颜色 ${color} 有效样本数:`, validSamples)
            console.log(`颜色 ${color} 通过样本数:`, sampleResults.length)
            console.log(`颜色 ${color} 最终结果:`, bestResult)
          }
        }
      } catch (error) {
        console.error('颜色验证错误:', error)
        this.$toast('验证失败，请重试')
      } finally {
        this.removeColorOverlay()
        this.isColorTesting = false
      }

      const passCount = results.filter(Boolean).length
      return passCount >= 2
    },

    // 创建颜色遮罩
    createColorOverlay() {
      this.colorOverlay = document.createElement('div')
      Object.assign(this.colorOverlay.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 9,
        opacity: 1,
        transition: 'background-color 0.1s ease'
      })
      document.body.appendChild(this.colorOverlay)
    },

    // 移除颜色遮罩
    removeColorOverlay() {
      if (this.colorOverlay && this.colorOverlay.parentNode) {
        this.colorOverlay.parentNode.removeChild(this.colorOverlay)
        this.colorOverlay = null
      }
    },

    // 修改颜色数据分析方法
    async analyzeColorReflection(color) {
      // 设置canvas优化属性
      const ctx = this.$refs.canvas.getContext('2d', {
        willReadFrequently: true
      })

      // 连续采集多帧进行对比
      const samples = []
      for (let i = 0; i < 3; i++) {
        const faces = await this.detector.estimateFaces(this.$refs.video)
        if (!faces || faces.length === 0) return false

        const face = faces[0]
        const faceBox = this.getFaceBoundingBox(face)

        // 将当前视频帧绘制到canvas
        ctx.drawImage(this.$refs.video, 0, 0, this.width, this.height)

        // 获取面部区域的图像数据
        const imageData = ctx.getImageData(faceBox.x, faceBox.y, faceBox.width, faceBox.height)

        // 计算RGB均值和最大值
        let totalPixels = 0
        let avgR = 0
        let avgG = 0
        let avgB = 0
        let maxR = 0
        let maxG = 0
        let maxB = 0

        for (let j = 0; j < imageData.data.length; j += 4) {
          const r = imageData.data[j]
          const g = imageData.data[j + 1]
          const b = imageData.data[j + 2]

          avgR += r
          avgG += g
          avgB += b

          maxR = Math.max(maxR, r)
          maxG = Math.max(maxG, g)
          maxB = Math.max(maxB, b)

          totalPixels++
        }

        samples.push({
          avg: {
            r: avgR / totalPixels,
            g: avgG / totalPixels,
            b: avgB / totalPixels
          },
          max: {
            r: maxR,
            g: maxG,
            b: maxB
          },
          timestamp: Date.now()
        })

        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // 检查样本之间的变化
      const variations = []
      for (let i = 1; i < samples.length; i++) {
        const prev = samples[i - 1].avg
        const curr = samples[i].avg

        variations.push({
          r: Math.abs(curr.r - prev.r),
          g: Math.abs(curr.g - prev.g),
          b: Math.abs(curr.b - prev.b)
        })
      }

      // 计算平均变化率
      const avgVariation = variations.reduce(
        (acc, curr) => ({
          r: acc.r + curr.r,
          g: acc.g + curr.g,
          b: acc.b + curr.b
        }),
        { r: 0, g: 0, b: 0 }
      )

      avgVariation.r /= variations.length
      avgVariation.g /= variations.length
      avgVariation.b /= variations.length

      if (this.debugMode) {
        console.log('颜色变化率:', avgVariation)
      }

      // 检查变化率
      const MIN_VARIATION = 0.05
      const hasVariation =
        avgVariation.r > MIN_VARIATION ||
        avgVariation.g > MIN_VARIATION ||
        avgVariation.b > MIN_VARIATION

      if (!hasVariation) return false

      // 分析最后一帧的颜色数据
      const lastSample = samples[samples.length - 1]
      const { avg, max } = lastSample

      // 计算颜色比例
      const totalAvg = avg.r + avg.g + avg.b
      const rRatio = avg.r / totalAvg
      const gRatio = avg.g / totalAvg
      const bRatio = avg.b / totalAvg

      // 计算最大值比例
      const totalMax = max.r + max.g + max.b
      const rMaxRatio = max.r / totalMax
      const gMaxRatio = max.g / totalMax
      const bMaxRatio = max.b / totalMax

      if (this.debugMode) {
        console.log('颜色比例:', {
          avg: { rRatio, gRatio, bRatio },
          max: { rMaxRatio, gMaxRatio, bMaxRatio }
        })
      }

      // 根据当前显示的颜色判断
      switch (color) {
        case '#FF0000':
          return rRatio > 0.35 || rMaxRatio > 0.38
        case '#00FF00':
          return gRatio > 0.32 || gMaxRatio > 0.35
        case '#0000FF':
          return bRatio > 0.3 || bMaxRatio > 0.33
        default:
          return false
      }
    },

    // 获取人脸边界框
    getFaceBoundingBox(face) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      face.keypoints.forEach(point => {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })

      return {
        x: Math.max(0, minX),
        y: Math.max(0, minY),
        width: maxX - minX,
        height: maxY - minY
      }
    },

    // 分颜色数据
    analyzeColorData(data, currentColor) {
      const expectedColor = this.hexToRgb(currentColor)
      let totalPixels = 0

      // 计算平均RGB值
      let avgR = 0
      let avgG = 0
      let avgB = 0
      for (let i = 0; i < data.length; i += 4) {
        avgR += data[i]
        avgG += data[i + 1]
        avgB += data[i + 2]
        totalPixels++
      }

      avgR = avgR / totalPixels
      avgG = avgG / totalPixels
      avgB = avgB / totalPixels

      // 计算RGB比例
      const totalValue = avgR + avgG + avgB
      const rRatio = avgR / totalValue
      const gRatio = avgG / totalValue
      const bRatio = avgB / totalValue

      if (this.debugMode) {
        console.log('平均RGB值:', { avgR, avgG, avgB })
        console.log('RGB比例:', {
          rRatio: `${(rRatio * 100).toFixed(2)}%`,
          gRatio: `${(gRatio * 100).toFixed(2)}%`,
          bRatio: `${(bRatio * 100).toFixed(2)}%`
        })
      }

      // 根据颜色比例变化判断
      switch (expectedColor.dominant) {
        case 'r':
          // 红色时，R比例应该大于40.5%，且明显大于G和B
          return rRatio > 0.4 && rRatio - gRatio > 0.07
        case 'g':
          // 绿色时，关注G比例的相对变化
          return (
            gRatio > 0.31 &&
            (gRatio > 0.32 || // G比例超过32%
              gRatio / rRatio > 0.785 || // G/R比例提高
              gRatio / bRatio > 1.17) // G/B比例提高
          )
        case 'b':
          // 蓝色时，关注B比例的相对变化
          return (
            bRatio > 0.27 &&
            (bRatio > 0.275 || // B比例超过27.5%
              bRatio / gRatio > 0.88 || // B/G比例提高
              gRatio - bRatio < 0.037) // G和B的差距减小
          )
        default:
          return false
      }
    },

    // 十六进制转RGB
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      const color = {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }

      const max = Math.max(color.r, color.g, color.b)
      if (color.r === color.g && color.g === color.b) {
        color.dominant = 'white'
      } else if (max === color.r) {
        color.dominant = 'r'
      } else if (max === color.g) {
        color.dominant = 'g'
      } else {
        color.dominant = 'b'
      }

      return color
    },

    // 分析验证结果
    analyzeValidationResults(results) {
      const passRate = results.filter(Boolean).length / results.length
      return passRate > 0.5
    },

    // 修改正脸检测方法
    async checkFrontalFace(face) {
      // 获取关键点
      const leftEye = face.keypoints[33] // 左眼角
      const rightEye = face.keypoints[263] // 右眼角
      const nose = face.keypoints[1] // 鼻尖
      const leftMouth = face.keypoints[61] // 左嘴角
      const rightMouth = face.keypoints[291] // 右嘴角

      // 计算面部对称性
      const eyeDistance = Math.abs(rightEye.x - leftEye.x)
      const mouthDistance = Math.abs(rightMouth.x - leftMouth.x)
      const noseDeviation = Math.abs((leftEye.x + rightEye.x) / 2 - nose.x)

      // 放宽判断标准
      const isSymmetric =
        noseDeviation / eyeDistance < 0.15 && // 鼻子偏移容忍度增加
        Math.abs(eyeDistance - mouthDistance) / eyeDistance < 0.5 // 眼距和嘴距比例容忍度增加

      // 添加姿态检测
      const leftEyeY = leftEye.y
      const rightEyeY = rightEye.y
      const eyeYDiff = Math.abs(leftEyeY - rightEyeY)
      const isLevelFace = eyeYDiff / eyeDistance < 0.15 // 允许轻微的头部倾斜

      if (this.debugMode) {
        console.log('面部检测:', {
          noseDeviation: (noseDeviation / eyeDistance).toFixed(3),
          mouthEyeRatio: (Math.abs(eyeDistance - mouthDistance) / eyeDistance).toFixed(3),
          eyeTilt: (eyeYDiff / eyeDistance).toFixed(3)
        })
      }

      return isSymmetric && isLevelFace
    },

    // 添加表情变化检测方法
    async checkExpressionChange(face) {
      // 获取关键点
      const upperLip = face.keypoints[13] // 上唇
      const lowerLip = face.keypoints[14] // 下唇
      const leftEyeTop = face.keypoints[159] // 左眼上
      const leftEyeBottom = face.keypoints[145] // 左眼下
      const rightEyeTop = face.keypoints[386] // 右眼上
      const rightEyeBottom = face.keypoints[374] // 右眼下

      // 计算眼睛和嘴巴的开合度
      const mouthOpen = Math.abs(upperLip.y - lowerLip.y)
      const leftEyeOpen = Math.abs(leftEyeTop.y - leftEyeBottom.y)
      const rightEyeOpen = Math.abs(rightEyeTop.y - rightEyeBottom.y)

      // 存储历史数据用于检测变化
      if (!this.expressionHistory) {
        this.expressionHistory = []
      }

      this.expressionHistory.push({
        mouthOpen,
        leftEyeOpen,
        rightEyeOpen,
        timestamp: Date.now()
      })

      // 只保留最近的记录
      if (this.expressionHistory.length > 10) {
        this.expressionHistory.shift()
      }

      // 检测是否有自然的表情变化
      if (this.expressionHistory.length < 3) return true

      const variations = this.expressionHistory.slice(-3).map((record, i, arr) => {
        if (i === 0) return 0
        return (
          Math.abs(record.mouthOpen - arr[i - 1].mouthOpen) +
          Math.abs(record.leftEyeOpen - arr[i - 1].leftEyeOpen) +
          Math.abs(record.rightEyeOpen - arr[i - 1].rightEyeOpen)
        )
      })

      const hasChange = variations.some(v => v > 0.02) // 阈值可调

      if (this.debugMode) {
        console.log('表情变化:', variations)
      }

      return hasChange
    }
  }
}
</script>

<style scoped lang="scss">
// scss
* {
  padding: 0;
  margin: 0;
}

/* 定义滚动条高宽及背景 高宽分别对应横竖滚动条的尺寸 */
::-webkit-scrollbar {
  width: 7px;
  height: 7px;
  background-color: #f5f5f5;
}

/* 定义滚动条轨道 内阴影+圆角 */
::-webkit-scrollbar-track {
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  background-color: #f5f5f5;
}

/* 定义滑块 内阴影+圆角 */
::-webkit-scrollbar-thumb {
  border-radius: 10px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1);
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1);
  background-color: #c8c8c8;
}
[v-cloak] {
  opacity: 0 !important;
}
.Camera-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 10;
  margin: 0 auto;
  border-radius: 50%;
  padding: 3px;
}
.van-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.canvas-wrapper {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
}
.canvas-wrapper > video {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  overflow: hidden;
}
.canvas-wrapper > canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  border-radius: 50%;
  overflow: hidden;
}
.videoDialog .van-dialog__message {
  line-height: 1;
  white-space: unset;
}
.FlipHorizontal-toggle {
  right: 10vw;
}
.Camera-toggle {
  left: 10vw;
}
.FlipHorizontal-toggle,
.Camera-toggle {
  position: fixed;
  bottom: 5vh;
  width: 15vw;
  height: 15vw;
  max-width: 50px;
  max-height: 50px;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20vw;
  -webkit-tap-highlight-color: transparent;
  z-index: 10;
  opacity: 0.8;
}
.FlipHorizontal-toggle > svg,
.Camera-toggle > svg {
  width: 7vw;
  max-width: 30px;
  transition: 0.5s;
  transform: scaleX(1);
}
.FlipHorizontalIng > svg {
  transform: scaleX(-1);
}
.btn-operate {
  text-align: center;
  padding: 15px;
}
.btn-operate > button {
  min-width: 160px;
  border-radius: 5px;
}
.prompt-text {
  padding: 15px;
  color: #000;
  margin-top: 1em;
}
.prompt-text > h5 {
  opacity: 0.9;
  padding-bottom: 1em;
}
.prompt-text > ol {
  opacity: 0.7;
  list-style: revert;
  font-size: 13px;
  line-height: 1.7;
  padding-left: 1em;
}
.van-notice-bar {
  width: 60%;
  margin: 1em auto 0 auto;
  border-radius: 100px;
  overflow: hidden;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  text-align: center;
}
.van-notice-bar .van-notice-bar__content,
.van-notice-bar .van-swipe-item {
  width: 100%;
}
.notice-swipe {
  height: 40px;
  line-height: 40px;
}
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 15px;
  padding: 0 15px;
}
.action-buttons .van-button {
  min-width: 100px;
  margin-bottom: 10px;
}
.bottom-buttons {
  position: fixed;
  bottom: 5vh;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 10vw;
}
.current-action {
  text-align: center;
  margin: 15px;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 8px;
}
.current-action p {
  margin: 5px 0;
  color: #666;
}
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}
.loading-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  .van-loading {
    margin-bottom: 10px;
  }
  span {
    display: block;
    color: #666;
    font-size: 14px;
  }
}

/* 可以添加一些样式来突出颜色验证按钮 */
.action-buttons .van-button--primary {
  background-color: #1989fa;
  border-color: #1989fa;
}
.action-buttons .van-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-header">
        <h2>3D汽车展厅</h2>
        <p>欢迎回来，请登录您的账号</p>
      </div>
      
      <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入用户名" 
            :prefix-icon="User"
            clearable>
          </el-input>
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            placeholder="请输入密码" 
            :prefix-icon="Lock"
            type="password"
            show-password
            clearable>
          </el-input>
        </el-form-item>
        
        <div class="login-options">
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          <el-link type="primary" :underline="false">忘记密码?</el-link>
        </div>
        
        <el-button type="primary" class="login-button" :loading="loading" @click="handleLogin">登录</el-button>
        
        <div class="register-link">
          <span>还没有账号?</span>
          <el-link type="primary" :underline="false">立即注册</el-link>
        </div>
      </el-form>
    </div>
    
    <div class="background" ref="backgroundRef"></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 路由实例
const router = useRouter()

// 表单引用
const loginFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
  ]
}

// 背景引用
const backgroundRef = ref(null)

// Three.js相关变量
let scene, camera, renderer, particles
let clock = new THREE.Clock()
let animationId = null
const particleCount = 2000

// 登录方法
const handleLogin = () => {
  if (!loginFormRef.value) return
  
  loginFormRef.value.validate(valid => {
    if (valid) {
      loading.value = true
      
      // 模拟登录请求
      setTimeout(() => {
        loading.value = false
        
        // 保存登录状态
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('username', loginForm.username)
        
        // 显示成功消息
        ElMessage.success('登录成功')
        
        // 跳转到首页
        router.push('/home')
      }, 1500)
    } else {
      ElMessage.error('请正确填写登录信息')
      return false
    }
  })
}

// 初始化Three.js背景
const initThreeBackground = () => {
  if (!backgroundRef.value) return
  
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050a30)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 15)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  
  // 添加到DOM
  backgroundRef.value.appendChild(renderer.domElement)
  
  // 创建粒子系统
  createParticles()
  
  // 监听窗口尺寸变化
  window.addEventListener('resize', onWindowResize)
  
  // 开始动画
  animate()
}

// 创建粒子
const createParticles = () => {
  // 创建粒子几何体
  const particlesGeometry = new THREE.BufferGeometry()
  const particlePositions = new Float32Array(particleCount * 3)
  const particleSizes = new Float32Array(particleCount)
  const colors = new Float32Array(particleCount * 3)
  
  // 设置粒子位置和颜色
  for (let i = 0; i < particleCount; i++) {
    // 随机位置
    const x = (Math.random() - 0.5) * 50
    const y = (Math.random() - 0.5) * 50
    const z = (Math.random() - 0.5) * 50
    
    particlePositions[i * 3] = x
    particlePositions[i * 3 + 1] = y
    particlePositions[i * 3 + 2] = z
    
    // 随机粒子大小
    particleSizes[i] = Math.random() * 2 + 0.5
    
    // 设置蓝色调的颜色
    const intensity = Math.random()
    colors[i * 3] = 0.1 * intensity     // 红色通道
    colors[i * 3 + 1] = 0.4 * intensity  // 绿色通道
    colors[i * 3 + 2] = intensity        // 蓝色通道
  }
  
  // 添加属性
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1))
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  
  // 创建着色器材质
  const particlesMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
          float distance = length(gl_PointCoord - vec2(0.5, 0.5));
          if (distance > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0 - (distance * 2.0));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  
  // 创建粒子系统
  particles = new THREE.Points(particlesGeometry, particlesMaterial)
  scene.add(particles)
}

// 窗口尺寸变化处理
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  const delta = clock.getDelta()
  
  // 粒子系统旋转
  if (particles) {
    particles.rotation.y += delta * 0.05
    particles.rotation.x += delta * 0.02
  }
  
  // 渲染场景
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// 组件挂载时初始化
onMounted(() => {
  initThreeBackground()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 移除事件监听
  window.removeEventListener('resize', onWindowResize)
  
  // 停止动画
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
  
  // 释放资源
  if (scene) {
    scene.clear()
  }
  
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.login-content {
  width: 400px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 30px;
  z-index: 10;
  backdrop-filter: blur(10px);
  position: relative;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 10px;
}

.login-header p {
  font-size: 14px;
  color: #606266;
}

.login-form {
  width: 100%;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}

.login-button {
  width: 100%;
  margin-bottom: 20px;
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: #606266;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
}

.background canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .login-content {
    width: 90%;
    max-width: 400px;
    padding: 20px;
  }
}
</style> 
<template>
  <div class="home-container">
    <el-container>
      <el-header height="60px">
        <div class="header-logo">3D汽车展厅</div>
        <div class="header-menu">
          <el-menu
            mode="horizontal"
            :ellipsis="false"
            background-color="transparent"
            text-color="#fff"
            active-text-color="#409EFF"
            :default-active="activeMenu"
          >
            <el-menu-item index="home">首页</el-menu-item>
            <el-menu-item index="gallery">车型展示</el-menu-item>
            <el-menu-item index="about">关于我们</el-menu-item>
          </el-menu>
        </div>
        <div class="header-user">
          <el-dropdown trigger="click">
            <div class="user-avatar">
              <el-avatar :size="36" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"></el-avatar>
              <span>{{ username }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item>设置</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main>
        <div class="car-showcase" ref="carShowcaseRef"></div>
        
        <!-- 加载指示器 -->
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-content">
            <el-progress 
              type="circle" 
              :percentage="loadingProgress" 
              :stroke-width="6"
              :width="120"
              :format="() => `${loadingProgress}%`"
              status="success">
            </el-progress>
            <p class="loading-text">正在加载3D模型...</p>
            <p class="loading-tip">首次加载可能需要一些时间，请耐心等待</p>
          </div>
        </div>
        
        <!-- 新设计的控制面板 -->
        <div class="control-panel" v-if="isPanelVisible">
          <div class="control-panel-inner">
            <!-- 车型选择器 -->
            <div class="car-selector-section">
              <h3 class="section-title">选择车型</h3>
              <div class="car-selector">
                <div 
                  v-for="(car, index) in carOptions" 
                  :key="car.value"
                  class="car-option" 
                  :class="{ active: selectedCar === car.value }"
                  @click="switchCar(car.value)"
                >
                  <div class="car-icon">
                    <component :is="car.icon" />
                  </div>
                  <div class="car-label">{{ car.label }}</div>
                </div>
              </div>
            </div>
            
            <!-- 控制按钮 -->
            <div class="car-controls-section">
              <h3 class="section-title">控制选项</h3>
              <div class="car-controls">
                <!-- 旋转控制 -->
                <div class="control-button" :class="{ active: isRotating }" @click="toggleRotate">
                  <el-tooltip content="旋转模型" placement="top" :show-after="500">
                    <div class="button-content">
                      <component :is="rotateIcon" />
                      <span>{{ isRotating ? '停止旋转' : '开始旋转' }}</span>
                    </div>
                  </el-tooltip>
                </div>
                
                <!-- 重置视角 -->
                <div class="control-button" @click="resetCamera">
                  <el-tooltip content="重置视角" placement="top" :show-after="500">
                    <div class="button-content">
                      <component :is="resetIcon" />
                      <span>重置视角</span>
                    </div>
                  </el-tooltip>
                </div>
                
                <!-- 灯光控制 -->
                <div class="control-button" :class="{ active: lightsOn }" @click="toggleLights">
                  <el-tooltip content="控制灯光" placement="top" :show-after="500">
                    <div class="button-content">
                      <component :is="lightIcon" />
                      <span>{{ lightsOn ? '关闭灯光' : '打开灯光' }}</span>
                    </div>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-main>
      
      <el-footer height="0px">
        <p>© 2023 3D汽车展厅 - 基于Vue3 + Element Plus + Three.js开发</p>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { 
  View, 
  Camera, 
  Sunny, 
  Moon, 
  RefreshRight, 
  RefreshLeft,
  TrendCharts,
  Van,
  OfficeBuilding
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import gsap from 'gsap'

// 路由实例
const router = useRouter()

// 活动菜单
const activeMenu = ref('home')

// 用户名
const username = ref(localStorage.getItem('username') || '用户')

// 3D场景引用
const carShowcaseRef = ref(null)

// 选中的车型
const selectedCar = ref('sports')

// 控制状态
const isRotating = ref(false)
const lightsOn = ref(true)

// Three.js相关变量
let scene, camera, renderer, controls
let car, carModels = []
let directionalLight, ambientLight, spotLights = []
let clock = new THREE.Clock()
let animationId = null
let loadingManager // 声明全局loadingManager变量

// 加载状态
const isLoading = ref(true);
const loadingProgress = ref(0);

// 控制面板的显示状态
const isPanelVisible = ref(false);

// 导入模型文件
import car3Model from '../models/car3.glb'
import car4Model from '../models/car4.glb'
import car5Model from '../models/car5.glb'

// 车型选项
const carOptions = [
  { label: '跑车', value: 'sports', icon: TrendCharts },
  { label: '轿车', value: 'sedan', icon: Van },
  { label: 'SUV', value: 'suv', icon: OfficeBuilding }
];

// 控制面板中使用的图标
const rotateIcon = ref(RefreshRight);
const resetIcon = ref(RefreshLeft);
const lightIcon = computed(() => lightsOn.value ? Sunny : Moon);

// 初始化Three.js场景
const initThreeScene = () => {
  if (!carShowcaseRef.value) return
  
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    carShowcaseRef.value.clientWidth / carShowcaseRef.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(5, 2, 5)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  })
  renderer.setSize(carShowcaseRef.value.clientWidth, carShowcaseRef.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  
  // 添加到DOM
  carShowcaseRef.value.appendChild(renderer.domElement)
  
  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.25
  controls.minDistance = 3
  controls.maxDistance = 10
  controls.maxPolarAngle = Math.PI / 2
  
  // 创建灯光
  setupLights()
  
  // 创建地面
  createFloor()
  
  // 创建汽车模型
  createCars()
  
  // 监听窗口尺寸变化
  window.addEventListener('resize', onWindowResize)
  
  // 开始动画
  animate()
}

// 设置灯光
const setupLights = () => {
  // 环境光
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  
  // 定向光
  directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 1024
  directionalLight.shadow.mapSize.height = 1024
  scene.add(directionalLight)
  
  // 聚光灯
  const spotlightPositions = [
    { position: { x: 5, y: 6, z: 5 }, color: 0xffffff, intensity: 1 },
    { position: { x: -5, y: 6, z: 5 }, color: 0xffeecc, intensity: 0.8 },
    { position: { x: 5, y: 6, z: -5 }, color: 0xccddff, intensity: 0.8 },
    { position: { x: -5, y: 6, z: -5 }, color: 0xffffff, intensity: 1 }
  ]
  
  spotlightPositions.forEach(config => {
    const spotlight = new THREE.SpotLight(
      config.color,
      config.intensity,
      60,
      Math.PI / 6,
      0.5,
      0.2
    )
    
    spotlight.position.set(
      config.position.x,
      config.position.y,
      config.position.z
    )
    
    spotlight.castShadow = true
    spotlight.shadow.mapSize.width = 1024
    spotlight.shadow.mapSize.height = 1024
    
    const targetObject = new THREE.Object3D()
    targetObject.position.set(0, 0, 0)
    scene.add(targetObject)
    spotlight.target = targetObject
    
    scene.add(spotlight)
    spotLights.push(spotlight)
  })
}

// 创建地面
const createFloor = () => {
  const floorGeometry = new THREE.PlaneGeometry(20, 20)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  
  // 添加网格辅助线
  const gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333)
  scene.add(gridHelper)
  
  // 创建展台
  const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 32)
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.3
  })
  const platform = new THREE.Mesh(platformGeometry, platformMaterial)
  platform.position.y = 0.1
  platform.receiveShadow = true
  scene.add(platform)
}

// 创建简易汽车模型
const createSimpleCar = (name, color, dimensions) => {
  const carGroup = new THREE.Group()
  carGroup.name = name
  
  // 车身
  const bodyGeometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.8
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.castShadow = true
  carGroup.add(body)
  
  // 车顶（仅适用于轿车和SUV）
  if (name !== 'sports') {
    const roofHeight = name === 'suv' ? dimensions.height * 0.6 : dimensions.height * 0.4
    const roofWidth = dimensions.width * 0.8
    const roofLength = dimensions.length * 0.6
    
    const roofGeometry = new THREE.BoxGeometry(roofWidth, roofHeight, roofLength)
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial)
    roof.position.y = dimensions.height / 2 + roofHeight / 2
    roof.castShadow = true
    carGroup.add(roof)
  }
  
  // 车轮
  const wheelRadius = dimensions.height * 0.3
  const wheelThickness = dimensions.width * 0.1
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 32)
  wheelGeometry.rotateX(Math.PI / 2)
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.5,
    metalness: 0.7
  })
  
  // 轮子位置
  const wheelPositions = [
    { x: -dimensions.width / 2 + wheelThickness / 2, y: -dimensions.height / 2 + wheelRadius, z: dimensions.length / 3 },
    { x: dimensions.width / 2 - wheelThickness / 2, y: -dimensions.height / 2 + wheelRadius, z: dimensions.length / 3 },
    { x: -dimensions.width / 2 + wheelThickness / 2, y: -dimensions.height / 2 + wheelRadius, z: -dimensions.length / 3 },
    { x: dimensions.width / 2 - wheelThickness / 2, y: -dimensions.height / 2 + wheelRadius, z: -dimensions.length / 3 }
  ]
  
  wheelPositions.forEach(position => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
    wheel.position.set(position.x, position.y, position.z)
    wheel.castShadow = true
    carGroup.add(wheel)
  })
  
  // 车灯
  const headlightGeometry = new THREE.SphereGeometry(0.1, 16, 16)
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffaa,
    emissiveIntensity: 0.5
  })
  
  const headlightPositions = [
    { x: -dimensions.width / 2 + 0.2, y: 0, z: dimensions.length / 2 - 0.1 },
    { x: dimensions.width / 2 - 0.2, y: 0, z: dimensions.length / 2 - 0.1 }
  ]
  
  headlightPositions.forEach(position => {
    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial)
    headlight.position.set(position.x, position.y, position.z)
    carGroup.add(headlight)
  })
  
  return carGroup
}

// 创建汽车模型
const createCars = () => {
  // 创建加载管理器
  loadingManager = new THREE.LoadingManager();
  
  // 设置加载进度回调
  loadingManager.onProgress = (url, loaded, total) => {
    const progress = Math.round(loaded / total * 100);
    loadingProgress.value = progress;
    console.log(`加载进度: ${progress}%, URL: ${url}`);
  };

  loadingManager.onLoad = () => {
    console.log('所有资源加载完成');
    setTimeout(() => {
      isLoading.value = false;
      loadingProgress.value = 100;
    }, 500);
  };
  
  loadingManager.onError = (url) => {
    console.error(`加载错误: ${url}`);
  };
  
  // 使用GLTFLoader加载真实的3D模型
  const loader = new GLTFLoader(loadingManager);
  
  // 定义要加载的汽车模型列表
  const carModelFiles = [
    { name: 'sports', file: car3Model },
    { name: 'sedan', file: car4Model },
    { name: 'suv', file: car5Model }
  ];
  
  // 加载每个模型
  carModelFiles.forEach((carInfo, index) => {
    loader.load(
      carInfo.file,
      (gltf) => {
        const model = gltf.scene;
        model.name = carInfo.name;
        
        // 根据模型大小调整位置和缩放
        model.position.set(0, 0.5, 0);
        
        // 根据不同模型调整缩放
        switch(carInfo.name) {
          case 'sports':
            model.scale.set(0.5, 0.5, 0.5);
            model.rotation.y = Math.PI; // 调整方向
            break;
          case 'sedan':
            model.scale.set(0.4, 0.4, 0.4);
            model.rotation.y = Math.PI / 2; // 调整方向
            break;
          case 'suv':
            model.scale.set(0.3, 0.3, 0.3);
            model.rotation.y = Math.PI / 4; // 调整方向
            break;
        }
        
        // 确保模型能投射和接收阴影
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // 改进材质
            if (child.material) {
              child.material.metalness = 0.8;
              child.material.roughness = 0.2;
              child.material.envMapIntensity = 1.5;
            }
          }
        });
        
        // 添加到模型数组
        carModels.push(model);
        
        // 如果是第一个模型，立即显示
        if (index === 0 && carModels.length === 1) {
          switchCar('sports');
        }
        
        console.log(`模型 ${carInfo.name} 加载完成`);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const modelProgress = Math.round(xhr.loaded / xhr.total * 100);
          console.log(`${carInfo.name}: ${modelProgress}% 加载完成`);
        }
      },
      (error) => {
        console.error(`模型 ${carInfo.name} 加载出错`, error);
        
        // 如果模型加载失败，创建一个备用简易模型
        if (carModels.length < carModelFiles.length) {
          let color, dimensions;
          
          switch(carInfo.name) {
            case 'sports':
              color = 0xffff00;
              dimensions = { length: 4.2, width: 1.9, height: 1 };
              break;
            case 'sedan':
              color = 0x3366ff;
              dimensions = { length: 4, width: 1.8, height: 1.2 };
              break;
            case 'suv':
              color = 0xff3333;
              dimensions = { length: 4.5, width: 2, height: 1.8 };
              break;
          }
          
          const backupModel = createSimpleCar(carInfo.name, color, dimensions);
          carModels.push(backupModel);
          
          // 如果还没有显示任何模型，显示这个备用模型
          if (!car) {
            switchCar(carInfo.name);
          }
          
          // 更新加载进度
          const currentProgress = loadingProgress.value;
          const increment = Math.round(100 / carModelFiles.length);
          loadingProgress.value = Math.min(currentProgress + increment, 99);
          
          // 如果所有模型都已处理（加载成功或失败），隐藏加载指示器
          if (carModels.length === carModelFiles.length) {
            setTimeout(() => {
              isLoading.value = false;
              loadingProgress.value = 100;
            }, 500);
          }
        }
      }
    );
  });
  
  // 如果5秒后仍没有模型加载成功，使用备用简易模型
  setTimeout(() => {
    if (carModels.length === 0) {
      console.log('模型加载超时，使用备用简易模型');
      createBackupCars();
      
      // 隐藏加载指示器
      isLoading.value = false;
      loadingProgress.value = 100;
    }
  }, 5000);
}

// 创建备用简易汽车模型
const createBackupCars = () => {
  // 创建备用简易模型
  const sportscar = createSimpleCar('sports', 0xffff00, { length: 4.2, width: 1.9, height: 1 });
  const sedan = createSimpleCar('sedan', 0x3366ff, { length: 4, width: 1.8, height: 1.2 });
  const suv = createSimpleCar('suv', 0xff3333, { length: 4.5, width: 2, height: 1.8 });
  
  // 添加到模型数组
  carModels.push(sportscar);
  carModels.push(sedan);
  carModels.push(suv);
  
 // 显示默认车型
  switchCar(selectedCar.value);
}

// 切换车型
const switchCar = (carType) => {
  selectedCar.value = carType;
  loadCarModel(carType);
}

// 窗口尺寸变化处理
const onWindowResize = () => {
  if (!carShowcaseRef.value) return
  
  camera.aspect = carShowcaseRef.value.clientWidth / carShowcaseRef.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(carShowcaseRef.value.clientWidth, carShowcaseRef.value.clientHeight)
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  const delta = clock.getDelta()
  
  // 控制器更新
  if (controls) {
    controls.update()
  }
  
  // 如果启用了自动旋转，旋转汽车
  if (isRotating.value && car) {
    car.rotation.y += delta * 0.5
  }
  
  // 渲染场景
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// 切换旋转
const toggleRotate = () => {
  isRotating.value = !isRotating.value
}

// 重置相机
const resetCamera = () => {
  camera.position.set(5, 2, 5)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
}

// 切换灯光
const toggleLights = () => {
  lightsOn.value = !lightsOn.value
  
  // 更新灯光状态
  spotLights.forEach(light => {
    light.visible = lightsOn.value
  })
  
  // 更新环境光强度
  if (ambientLight) {
    ambientLight.intensity = lightsOn.value ? 0.8 : 0.2
  }
}

// 退出登录
const handleLogout = () => {
  ElMessageBox.confirm(
    '确定要退出登录吗?',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 清除登录状态
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('username')
    
    ElMessage.success('已退出登录')
    router.push('/login')
  }).catch(() => {})
}

// 加载指定类型的汽车模型
const loadCarModel = (carType) => {
  // 移除当前车型
  if (car) {
    // 添加退出动画
    gsap.to(car.position, {
      y: car.position.y + 3,
      duration: 0.8,
      ease: "power2.in",
      onComplete: () => {
        scene.remove(car);
        
        // 查找对应的车型模型
        const modelIndex = carModels.findIndex(model => model.name === carType);
        
        if (modelIndex !== -1) {
          // 显示新车型
          car = carModels[modelIndex];
          
          // 设置初始位置在场景上方
          car.position.y += 3;
          scene.add(car);
          
          // 添加入场动画效果
          gsap.to(car.position, {
            y: car.position.y - 3,
            duration: 1,
            ease: "bounce.out"
          });
          
          gsap.from(car.rotation, {
            y: car.rotation.y - Math.PI * 2,
            duration: 1.5,
            ease: "power2.out"
          });
          
          // 添加闪光效果
          createFlashEffect();
        } else {
          console.error(`未找到车型: ${carType}`);
        }
      }
    });
  } else {
    // 没有当前车型，直接加载新车型
    const modelIndex = carModels.findIndex(model => model.name === carType);
    
    if (modelIndex !== -1) {
      car = carModels[modelIndex];
      scene.add(car);
      
      // 添加入场动画效果
      gsap.from(car.position, {
        y: car.position.y + 3,
        duration: 1,
        ease: "bounce.out"
      });
      
      // 添加闪光效果
      createFlashEffect();
    } else {
      console.error(`未找到车型: ${carType}`);
    }
  }
}

// 创建车型切换时的闪光效果
const createFlashEffect = () => {
  // 创建一个平面几何体
  const flashGeometry = new THREE.PlaneGeometry(10, 10);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.y = 0.1;
  flash.rotation.x = -Math.PI / 2;
  scene.add(flash);
  
  // 动画效果
  gsap.to(flashMaterial, {
    opacity: 0,
    duration: 0.8,
    ease: "power2.out",
    onComplete: () => {
      scene.remove(flash);
      flashGeometry.dispose();
      flashMaterial.dispose();
    }
  });
}

// 组件挂载时初始化
onMounted(() => {
  initThreeScene();
  
  // 延迟显示控制面板，添加入场动画效果
  setTimeout(() => {
    isPanelVisible.value = true;
  }, 1000);
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
.home-container {
  width: 100%;
  height: 100%;
  color: #606266;
  overflow: hidden;
}

.el-container {
  width: 100%;
  height: 100%;
  flex-direction: column;
}

.el-header {
  background-color: #24292e;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.header-logo {
  font-size: 20px;
  font-weight: bold;
}

.header-menu {
  flex: 1;
  margin-left: 40px;
}

.header-user {
  display: flex;
  align-items: center;
}

.user-avatar {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-avatar span {
  margin-left: 10px;
  font-size: 14px;
}

.el-main {
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  flex: 1;
  overflow: hidden;
}

.car-showcase {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.car-showcase canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* 新的控制面板样式 */
.control-panel {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  z-index: 10;
  animation: panel-slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes panel-slide-up {
  0% {
    transform: translate(-50%, 100px);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.control-panel-inner {
  background-color: rgba(30, 30, 30, 0.85);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.car-selector-section, .car-controls-section {
  width: 48%;
  animation: fade-in 0.5s ease-out forwards;
  animation-delay: 0.3s;
  opacity: 0;
}

.car-controls-section {
  animation-delay: 0.5s;
}

@keyframes fade-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  color: #fff;
  font-size: 16px;
  margin-bottom: 15px;
  font-weight: 500;
  position: relative;
  padding-left: 15px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background: linear-gradient(to bottom, #409EFF, #53a8ff);
  border-radius: 2px;
}

.car-selector {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.car-option, .control-button {
  flex: 1;
  background-color: rgba(60, 60, 60, 0.5);
  border-radius: 10px;
  padding: 15px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.car-option::before, .control-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0), rgba(64, 158, 255, 0.2));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.car-option:hover::before, .control-button:hover::before {
  opacity: 1;
}

.car-option:hover, .control-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.car-option.active {
  background: linear-gradient(135deg, #409EFF, #53a8ff);
  box-shadow: 0 5px 15px rgba(64, 158, 255, 0.3);
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.3);
}

.car-option.active::before {
  opacity: 0;
}

.control-button.active {
  background: linear-gradient(135deg, #67C23A, #85ce61);
  box-shadow: 0 5px 15px rgba(103, 194, 58, 0.3);
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.3);
}

.control-button.active::before {
  opacity: 0;
}

.car-icon, .button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  height: 100%;
  justify-content: center;
}

.car-icon svg, .button-content svg {
  width: 32px;
  height: 32px;
  margin-bottom: 12px;
}

.car-label, .button-content span {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.car-controls {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .control-panel-inner {
    flex-direction: column;
    padding: 15px;
  }
  
  .car-selector-section, .car-controls-section {
    width: 100%;
  }
  
  .car-controls-section {
    margin-top: 20px;
  }
  
  .car-selector, .car-controls {
    flex-wrap: wrap;
  }
  
  .car-option, .control-button {
    padding: 10px;
    height: 80px;
  }
  
  .car-icon svg, .button-content svg {
    width: 24px;
    height: 24px;
    margin-bottom: 5px;
  }
  
  .car-label, .button-content span {
    font-size: 12px;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(5px);
}

.loading-text {
  margin-top: 20px;
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.loading-tip {
  margin-top: 10px;
  color: #ccc;
  font-size: 14px;
}
</style> 
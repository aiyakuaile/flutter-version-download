<template>
  <el-container class="layout-container">
    <el-header height="auto" class="app-header">
      <el-card class="header-card" shadow="never">
        <div class="header-controls">
          <div class="control-group">
            <span class="control-label">镜像源：</span>
            <el-select 
              v-model="selectedMirror" 
              placeholder="请选择镜像源" 
              @change="handleMirrorChange"
              class="mirror-select"
            >
              <el-option
                v-for="item in mirrors"
                :key="item.base_url"
                :label="item.mirror"
                :value="item.base_url"
              />
            </el-select>

            <span class="control-label control-label-margin">系统：</span>
            <el-select 
              v-model="activeOS" 
              class="os-select" 
              @change="handleOSChange"
            >
              <el-option label="Windows" value="windows" />
              <el-option label="macOS" value="macos" />
              <el-option label="Linux" value="linux" />
            </el-select>

            <span class="control-label control-label-margin">发布通道：</span>
            <el-select 
              v-model="activeChannel" 
              class="channel-select" 
              @change="handleChannelChange"
            >
              <el-option label="全部" value="all" />
              <el-option label="稳定版" value="stable" />
              <el-option label="测试版" value="beta" />
              <el-option label="开发版" value="dev" />
            </el-select>
          </div>
          
          <div class="theme-switch">
            <el-icon class="theme-icon"><Sunny /></el-icon>
            <el-switch
              v-model="isDark"
              inline-prompt
              @change="toggleTheme"
              style="margin: 0 8px"
            />
            <el-icon class="theme-icon"><Moon /></el-icon>
          </div>
        </div>
      </el-card>
    </el-header>
    
    <el-main class="main-container">
      <el-card 
        class="table-card" 
        shadow="never" 
        v-loading="loading"
        :element-loading-background="isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)'"
      >
        <el-table 
          :data="filteredVersionList" 
          style="width: 100%"
          height="100%"
          @sort-change="handleSortChange"
          :default-sort="{ prop: 'release_date', order: 'descending' }"
          stripe
        >
          <el-table-column prop="version" label="Version" width="150" fixed />
          <el-table-column label="Channel" width="100">
            <template #default="{ row }">
              <el-tag
                :type="getChannelTagType(row.channel)"
                size="small"
              >
                {{ getChannelLabel(row.channel) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="dart_sdk_arch" label="Architecture" width="150" />
          <el-table-column 
            prop="release_date"
            label="Date" 
            width="180" 
            sortable
          >
            <template #default="{ row }">
              {{ formatDate(row.release_date) }}
            </template>
          </el-table-column>
          <el-table-column 
            prop="dart_sdk_version" 
            label="DartVersion" 
            width="200"
            :show-overflow-tooltip="false"
            class-name="multi-line-column"
          />
          <el-table-column 
            prop="hash" 
            label="hash" 
            min-width="200"
            :show-overflow-tooltip="false"
            class-name="multi-line-column"
          />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button 
                type="primary" 
                @click="handleDownload(scope.row)"
                class="download-button"
              >
                下载
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const mirrors = [
  {
    mirror: "官方网站",
    base_url: "https://storage.googleapis.com/flutter_infra_release/releases/"
  },
  {
    mirror: "中国Flutter用户组(CFUG)",
    base_url: "https://storage.flutter-io.cn/flutter_infra_release/releases/"
  },
  {
    mirror: "清华大学开源镜像",
    base_url: "https://mirrors.tuna.tsinghua.edu.cn/flutter/flutter_infra_release/releases/"
  }
]

// 检测���前操作系统
const detectOS = () => {
  if (utools.isWindows()) {
    return 'windows'
  }
  if (utools.isLinux()) {
    return 'linux'
  }
  return 'macos'
}

const selectedMirror = ref(mirrors[1].base_url)
const activeChannel = ref('stable') // 默认使用稳定版
const activeOS = ref(detectOS()) // 根据当前系统设置默认值
const versionList = ref([])
const loading = ref(false)
const sortOrder = ref('descending')

// 获取通道标签文本
const getChannelLabel = (channel) => {
  const channelMap = {
    'stable': '稳定版',
    'beta': '测试版',
    'dev': '开发版'
  }
  return channelMap[channel] || channel
}

// 获取通道标签类型
const getChannelTagType = (channel) => {
  const typeMap = {
    'stable': 'success',
    'beta': 'warning',
    'dev': 'info'
  }
  return typeMap[channel] || ''
}

// 修改过滤逻辑
const filteredVersionList = computed(() => {
  let filtered = activeChannel.value === 'all' 
    ? versionList.value 
    : versionList.value.filter(item => item.channel === activeChannel.value)
  
  // 排序逻辑保持不变
  if (sortOrder.value) {
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.release_date).getTime()
      const dateB = new Date(b.release_date).getTime()
      return sortOrder.value === 'ascending' ? dateA - dateB : dateB - dateA
    })
  }
  
  return filtered
})

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取版本列表
const fetchVersionList = async () => {
  loading.value = true
  try {
    const response = await fetch(`${selectedMirror.value}releases_${activeOS.value}.json`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    versionList.value = data.releases // 移除下载态
  } catch (error) {
    console.error('Error fetching version list:', error)
    ElMessage.error('获取版本列表失败')
    versionList.value = []
  } finally {
    loading.value = false
  }
}

const handleMirrorChange = () => {
  fetchVersionList()
}

const handleChannelChange = () => {
  // 不需要重新获取数据，为使用computed过滤
}

const handleOSChange = () => {
  fetchVersionList()
}

const handleDownload = (row) => {
  const downloadUrl = `${selectedMirror.value}${row.archive}`
  utools.shellOpenExternal(downloadUrl)
}

// 处理排序变化
const handleSortChange = ({ prop, order }) => {
  if (prop === 'release_date') {
    // 如��尝试取消排序，则默认使用降序
    sortOrder.value = order || 'descending'
  }
}

// 主题切换相关
const isDark = ref(document.documentElement.classList.contains('dark'))

// 切换主题
const toggleTheme = (value) => {
  const html = document.documentElement
  if (value) {
    html.classList.add('dark')
    // 保存主题偏好
    localStorage.setItem('theme', 'dark')
  } else {
    html.classList.remove('dark')
    // 保存主题偏好
    localStorage.setItem('theme', 'light')
  }
}

// 在组件挂载时检查保存的主题偏好
onMounted(() => {
  fetchVersionList()
  
  // 从 localStorage 读取主题设置
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
    toggleTheme(isDark.value)
  } else {
    // 如果没有保存的主题设置，则使用系统偏好
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    toggleTheme(isDark.value)
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-overlay);
  padding: 16px 24px;
}

.app-header {
  padding: 0;
  background: transparent;
}

.header-card {
  margin-bottom: 16px;
  border-radius: 12px;
  background-color: var(--el-bg-color);
  border: none;
  box-shadow: 0 0px 10px rgba(0, 0, 0, 0.1);
}

.header-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.control-label-margin {
  margin-left: 8px;
}

.mirror-select {
  width: 220px;
}

.os-select {
  width: 140px;
}

.channel-select {
  width: 140px;
}

.os-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.os-option .el-icon {
  font-size: 16px;
}

.table-card {
  height: 100%;
  border-radius: 12px;
  background-color: var(--el-bg-color);
}

.table-card :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.main-container {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 表格样式优化 */
.el-table {
  --el-table-header-bg-color: var(--el-bg-color);
  height: 100% !important;
}

/* 确保表格体可以滚动 */
.el-table :deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

/* 移除单格边框 */
.el-table :deep(td.el-table__cell),
.el-table :deep(th.el-table__cell) {
  border: none;
}

/* 表头样式 */
.el-table :deep(th.el-table__cell) {
  background-color: var(--el-table-header-bg-color);
  font-weight: 600;
}

/* 使用细线替代阴影 */
.el-table :deep(.el-table__header-wrapper) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 移除表格外边框 */
.el-table :deep(.el-table__inner-wrapper::before),
.el-table :deep(.el-table__border-left-patch) {
  display: none;
}

/* 简化斑马纹样式 */
.el-table :deep(.el-table__row--striped) {
  background-color: var(--el-fill-color-light);
}

/* 移除行悬浮效果 */
.el-table :deep(.el-table__row) {
  transition: none;
}

.el-table :deep(.el-table__row:hover) {
  background-color: var(--el-table-row-hover-bg-color);
  transform: none;
}

/* 固定列背景色 */
.el-table :deep(.el-table-fixed-column--left),
.el-table :deep(.el-table-fixed-column--right) {
  background-color: var(--el-bg-color);
}

/* 允许文字换行的列样式 */
.el-table :deep(.multi-line-column) {
  white-space: normal;
  line-height: 1.5;
}

/* 调整单元格内边距 */
.el-table :deep(.el-table__cell) {
  padding: 8px;
}

.theme-switch {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.theme-icon {
  font-size: 16px;
  color: var(--el-text-color-secondary);
}

/* 下载按钮样式 */
.download-button {
  width: 80px;
  height: 32px;
  font-size: 14px;
  padding: 8px 16px;
  font-weight: 500;
}

/* 移除所有自定义 loading 相关的样式 */
.custom-loading {
  display: none;
}
</style>
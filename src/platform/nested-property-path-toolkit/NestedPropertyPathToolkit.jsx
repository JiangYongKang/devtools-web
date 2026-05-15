import React, { useState } from 'react'
import './NestedPropertyPathToolkit.css'
import {
  deeplyNestedObject,
  sparseArrayObject,
  mapLikeObject,
  exampleSchema,
  sensitivePaths,
} from './logic/examples.js'
import {
  getPath,
  setPathImmutable,
  parsePath,
  validateForm,
  flattenObject,
  unflattenObject,
  diff,
  maskSensitiveData,
  PathError,
  ValidationError,
} from './logic/index.js'

function NestedPropertyPathToolkit() {
  const [activeTab, setActiveTab] = useState('getPath')
  const [selectedExample, setSelectedExample] = useState('deep')
  const [getPathInput, setGetPathInput] = useState('user.profile.contact.addresses[0].city')
  const [getPathResult, setGetPathResult] = useState(null)
  const [getPathError, setGetPathError] = useState(null)
  const [strictMode, setStrictMode] = useState(false)

  const [setPathInput, setSetPathInput] = useState('user.profile.name.first')
  const [setPathValue, setSetPathValue] = useState('Jane')
  const [setPathResult, setSetPathResult] = useState(null)

  const [formData, setFormData] = useState({ ...deeplyNestedObject })
  const [validationErrors, setValidationErrors] = useState({})
  const [validationSuccess, setValidationSuccess] = useState(false)

  const [newObj, setNewObj] = useState(JSON.stringify(deeplyNestedObject, null, 2))
  const [diffResult, setDiffResult] = useState([])

  const examples = {
    deep: deeplyNestedObject,
    sparse: sparseArrayObject,
    map: mapLikeObject,
  }

  const currentObject = examples[selectedExample]

  const handleGetPath = () => {
    try {
      const result = getPath(currentObject, getPathInput, { strict: strictMode })
      setGetPathResult(result)
      setGetPathError(null)
    } catch (e) {
      setGetPathError(e)
      setGetPathResult(null)
    }
  }

  const handleSetPath = () => {
    try {
      let value = setPathValue
      if (setPathValue === 'true') value = true
      if (setPathValue === 'false') value = false
      if (setPathValue === 'null') value = null
      if (!isNaN(Number(setPathValue)) && setPathValue !== '') value = Number(setPathValue)

      const result = setPathImmutable(currentObject, setPathInput, value)
      setSetPathResult(result)
    } catch (e) {
      console.error(e)
    }
  }

  const handleValidate = () => {
    try {
      validateForm(formData, exampleSchema)
      setValidationErrors({})
      setValidationSuccess(true)
      setTimeout(() => setValidationSuccess(false), 3000)
    } catch (e) {
      if (e instanceof ValidationError) {
        setValidationErrors(e.fieldErrors)
        setValidationSuccess(false)
      }
    }
  }

  const handleDiff = () => {
    try {
      const newObjParsed = JSON.parse(newObj)
      const changes = diff(currentObject, newObjParsed, { detectArrayMoves: true })
      setDiffResult(changes)
    } catch (e) {
      console.error(e)
    }
  }

  const handleMaskSensitive = () => {
    const masked = maskSensitiveData(currentObject, sensitivePaths)
    setNewObj(JSON.stringify(masked, null, 2))
  }

  const renderJson = (obj) => (
    <pre className="code-block">{JSON.stringify(obj, null, 2)}</pre>
  )

  const renderGetPathDemo = () => (
    <div className="section">
      <h3>getPath 演示</h3>
      <p className="info-text">
        使用路径字符串安全地访问嵌套属性。支持点号表示法、方括号表示法、数组索引和通配符。
      </p>
      <div className="input-group">
        <input
          type="text"
          className="input-field"
          value={getPathInput}
          onChange={(e) => setGetPathInput(e.target.value)}
          placeholder="输入路径，如: user.profile.name.first"
        />
        <button className="button" onClick={handleGetPath}>
          获取值
        </button>
        <button
          className={`button ${strictMode ? 'active' : ''}`}
          onClick={() => setStrictMode(!strictMode)}
        >
          Strict 模式: {strictMode ? '开' : '关'}
        </button>
      </div>

      {getPathResult !== null && (
        <div className="result-display success">
          <strong>结果:</strong>
          <pre>{JSON.stringify(getPathResult, null, 2)}</pre>
        </div>
      )}

      {getPathError && (
        <div className="result-display error">
          <strong>错误 ({getPathError.code}):</strong>
          <p>{getPathError.message}</p>
          {getPathError.offset !== null && <p>偏移位置: {getPathError.offset}</p>}
          {getPathError.path && <p>路径: {getPathError.path}</p>}
        </div>
      )}

      <div className="grid">
        <div>
          <h4>路径解析结果:</h4>
          <pre className="code-block">
            {JSON.stringify(parsePath(getPathInput), null, 2)}
          </pre>
        </div>
        <div>
          <h4>示例路径:</h4>
          <ul>
            <li><code>user.profile.name.first</code></li>
            <li><code>user.profile.contact.addresses[0].city</code></li>
            <li><code>user.profile.contact.addresses[*].city</code> (通配符)</li>
            <li><code>user.settings.preferences.theme</code></li>
          </ul>
        </div>
      </div>
    </div>
  )

  const renderSetPathDemo = () => (
    <div className="section">
      <h3>setPathImmutable 演示</h3>
      <p className="info-text">
        不可变地更新嵌套属性。原对象保持不变，返回新对象。
      </p>
      <div className="input-group">
        <input
          type="text"
          className="input-field"
          value={setPathInput}
          onChange={(e) => setSetPathInput(e.target.value)}
          placeholder="输入路径"
        />
        <input
          type="text"
          className="input-field"
          value={setPathValue}
          onChange={(e) => setSetPathValue(e.target.value)}
          placeholder="输入值"
        />
        <button className="button" onClick={handleSetPath}>
          设置值
        </button>
      </div>

      {setPathResult && (
        <div>
          <h4>结果对象:</h4>
          {renderJson(setPathResult)}
        </div>
      )}

      <div className="grid">
        <div>
          <h4>原对象 (不变):</h4>
          {renderJson(currentObject)}
        </div>
        <div>
          <h4>示例路径:</h4>
          <ul>
            <li><code>user.profile.name.middle = 'Lee'</code> (新建属性)</li>
            <li><code>user.profile.contact.addresses[2].city = 'Chicago'</code> (新建数组元素)</li>
            <li><code>user.settings.preferences.theme = 'light'</code> (更新值)</li>
            <li><code>user.profile.contact.addresses[*].selected = true</code> (批量更新)</li>
          </ul>
        </div>
      </div>
    </div>
  )

  const renderFormDemo = () => (
    <div className="section">
      <h3>表单绑定与 Schema 验证</h3>
      <p className="info-text">
        扁平 name 属性到嵌套对象的双向映射。支持数组通配符批量校验。
      </p>

      <div className="grid">
        <div>
          <h4>扁平 name 映射:</h4>
          <div className="code-block">
            {Object.entries(flattenObject(formData)).slice(0, 15).map(([key, value]) => (
              <div key={key}>
                {key}: {JSON.stringify(value)}
              </div>
            ))}
            <div>... (共 {Object.keys(flattenObject(formData)).length} 项)</div>
          </div>
        </div>
        <div>
          <h4>Schema 规则:</h4>
          {renderJson(exampleSchema)}
        </div>
      </div>

      <div className="button-group" style={{ marginTop: 16 }}>
        <button className="button" onClick={handleValidate}>
          验证表单
        </button>
        <button
          className="button"
          onClick={() => {
            const invalidData = setPathImmutable(formData, 'user.profile.contact.email', 'invalid-email')
            setFormData(invalidData)
            setValidationSuccess(false)
            setValidationErrors({})
          }}
        >
          插入无效数据测试
        </button>
      </div>

      {validationSuccess && (
        <div className="result-display success" style={{ marginTop: 16 }}>
          ✅ 表单验证通过！所有字段都符合 Schema 规则。
        </div>
      )}

      {Object.keys(validationErrors).length > 0 && (
        <div className="schema-errors">
          <h4>验证错误:</h4>
          <ul className="error-list">
            {Object.entries(validationErrors).map(([path, errors]) => (
              <li key={path} className="error-item">
                <strong>{path}:</strong> {errors[0].message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h4>嵌套对象:</h4>
        {renderJson(formData)}
      </div>
    </div>
  )

  const renderDiffDemo = () => (
    <div className="section">
      <h3>Diff 与敏感字段脱敏</h3>
      <p className="info-text">
        比较两个对象，输出变更路径列表。支持敏感字段脱敏打印。
      </p>

      <div className="json-compare">
        <div>
          <h4>原对象:</h4>
          {renderJson(currentObject)}
        </div>
        <div>
          <h4>新对象 (可编辑):</h4>
          <textarea
            className="code-block"
            style={{ width: '100%', minHeight: 400 }}
            value={newObj}
            onChange={(e) => setNewObj(e.target.value)}
          />
        </div>
      </div>

      <div className="button-group" style={{ marginTop: 16 }}>
        <button className="button" onClick={handleDiff}>
          比较差异
        </button>
        <button className="button" onClick={handleMaskSensitive}>
          脱敏敏感字段
        </button>
      </div>

      {diffResult.length > 0 && (
        <div>
          <h4>变更路径 ({diffResult.length} 项):</h4>
          {diffResult.map((change, index) => (
            <div key={index} className={`diff-item ${change.type}`}>
              [{change.type.toUpperCase()}] {change.path}
              {change.type === 'update' && `: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.value)}`}
              {change.type === 'add' && `: ${JSON.stringify(change.value)}`}
              {change.type === 'move' && ` → ${change.toPath}`}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h4>敏感路径列表:</h4>
        {renderJson(sensitivePaths)}
      </div>
    </div>
  )

  const renderStrictDemo = () => (
    <div className="section">
      <h3>Strict 模式演示</h3>
      <p className="info-text">
        在 strict 模式下，访问 null 中间节点或不存在的路径会抛出错误。
        非 strict 模式返回默认值 undefined。
      </p>

      <div className="grid">
        <div>
          <h4>存在 null 中间节点的对象:</h4>
          {renderJson({
            a: {
              b: null,
              c: 'exists',
            },
          })}
        </div>
        <div>
          <h4>测试结果:</h4>
          <div className="result-display" style={{ marginBottom: 8 }}>
            <strong>非 strict 模式:</strong>
            <pre>getPath(obj, 'a.b.c') → undefined</pre>
          </div>
          <div className="result-display error">
            <strong>strict 模式:</strong>
            <pre>getPath(obj, 'a.b.c', {'{'}strict: true{'}'}) → 抛出 PathError</pre>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h4>常见测试用例:</h4>
        <ul>
          <li><code>getPath(null, 'a.b')</code> → strict 模式报错</li>
          <li><code>getPath({'{'}a: {'}'}, 'a.b.c')</code> → strict 模式报错</li>
          <li><code>getPath([1, 2], '[5]')</code> → strict 模式报错 (数组越界)</li>
          <li><code>getPath({'{'}a: {'{'}b: 1{'}'}{'}'}, 'a.c.d')</code> → strict 模式报错</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="nested-property-toolkit">
      <h1>Nested Property Path Toolkit</h1>

      <div className="section">
        <h2>选择示例数据</h2>
        <div className="button-group">
          <button
            className={`button ${selectedExample === 'deep' ? 'active' : ''}`}
            onClick={() => setSelectedExample('deep')}
          >
            深嵌套对象
          </button>
          <button
            className={`button ${selectedExample === 'sparse' ? 'active' : ''}`}
            onClick={() => setSelectedExample('sparse')}
          >
            稀疏数组
          </button>
          <button
            className={`button ${selectedExample === 'map' ? 'active' : ''}`}
            onClick={() => setSelectedExample('map')}
          >
            Map-like 对象 (特殊键名)
          </button>
        </div>
        <h3>当前对象:</h3>
        {renderJson(currentObject)}
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'getPath' ? 'active' : ''}`}
          onClick={() => setActiveTab('getPath')}
        >
          getPath
        </button>
        <button
          className={`tab ${activeTab === 'setPath' ? 'active' : ''}`}
          onClick={() => setActiveTab('setPath')}
        >
          setPathImmutable
        </button>
        <button
          className={`tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          表单绑定与验证
        </button>
        <button
          className={`tab ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          Diff 与脱敏
        </button>
        <button
          className={`tab ${activeTab === 'strict' ? 'active' : ''}`}
          onClick={() => setActiveTab('strict')}
        >
          Strict 模式
        </button>
      </div>

      {activeTab === 'getPath' && renderGetPathDemo()}
      {activeTab === 'setPath' && renderSetPathDemo()}
      {activeTab === 'form' && renderFormDemo()}
      {activeTab === 'diff' && renderDiffDemo()}
      {activeTab === 'strict' && renderStrictDemo()}
    </div>
  )
}

export default NestedPropertyPathToolkit

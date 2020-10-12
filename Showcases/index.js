// cesium碰撞测试
const homePosition = [118.9224, 32.1033, 100] //初始位置
var viewer
var GLTFLoader = new THREE.GLTFLoader
function init() {
	if (viewer) return false
	viewer = new Cesium.Viewer('cesiumContainer')
	viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function(evt) {
		look(homePosition[0], homePosition[1], homePosition[2])
		evt.cancel = true
	})
	look(homePosition[0], homePosition[1], homePosition[2])
	const imageryProviderViewModels = viewer.baseLayerPicker.viewModel.imageryProviderViewModels
	viewer.baseLayerPicker.viewModel.selectedImagery = imageryProviderViewModels[3]
	viewer.extend(Cesium.viewerCesiumInspectorMixin)
	viewer.cesiumInspector.container.style.display = 'none'
	viewer.scene.debugShowFramesPerSecond = true
}

function look(lon, lat, offset) {
	if (!viewer) return false
	const center = Cesium.Cartesian3.fromDegrees(lon, lat)
	const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center)

	const camera = viewer.camera
	camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z
	camera.lookAtTransform(transform, new Cesium.Cartesian3(-offset, -offset, offset))
	setTimeout(function() {
		camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
	}, 100)
}

init()

const MeshVisualizer = Cesium.MeshVisualizer
const Mesh = Cesium.Mesh
const MeshMaterial = Cesium.MeshMaterial
const MeshPhongMaterial = Cesium.MeshPhongMaterial
const FramebufferTexture = Cesium.GeometryUtils
const LOD = Cesium.LOD
homePosition[2] = 100
const center = Cesium.Cartesian3.fromDegrees(homePosition[0], homePosition[1], 20)
const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center)

const meshVisualizer = new MeshVisualizer({
	modelMatrix,
	up: { z: 1 },
	referenceAxisParameter: {
		length: 100,
		width: 0.5,
		headLength: 2,
		headWidth: 1.0
	}
})

viewer.scene.primitives.add(meshVisualizer)
meshVisualizer.showReference = true

var world,
	RedBody,
	grayBody,
	testBody,
	truckBody,
	groundMeshBody,
	timeStep = 1 / 60
var scene = viewer.scene
initCannon()
function createCannonBody(boxPosition, config, isConstant = false, modelPosition) {
	// 创建cannon刚体显示model
	const box = {
		outline: true,
		outlineColor: Cesium.Color.BLACK
	}
	Object.assign(box, config)
	const  boxWorldPosition = new Cesium.Cartesian3()
	// box.material = box.material.withAlpha(0.9)
	let entitie = {}
	if(modelPosition) {
		entitie = {
			position: modelPosition,
			box
		}
	} else {
		entitie = {
			position: new Cesium.CallbackProperty(function(time) {
				meshVisualizer.localToWorldCoordinates(boxPosition, boxWorldPosition)
				return boxWorldPosition
			}, isConstant),
			box
		}
	}
	const cannonModel = viewer.entities.add(entitie)

	const dimensions = box.dimensions
	const position = new CANNON.Vec3(boxPosition.x, boxPosition.y, boxPosition.z)
	const shape = new CANNON.Box(new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2))
	body = new CANNON.Body({
		mass: 1,
		position
	})
	body.addShape(shape)
	body.addEventListener('collide', e => {
		console.log('------------->碰撞', e)
	})
	// body.collisionResponse = false // 取消碰撞效果
	world.addBody(body)
	return { cannonModel, body }
}

// 灰色方块
var grayBoxPosGet = new Cesium.Cartesian3(0,0,-6.5)
grayBody = createCannonBody(grayBoxPosGet, {
	dimensions: new Cesium.Cartesian3(50, 50, 10),
	material: Cesium.Color.GRAY
})
function getRadian(degrees) {
	// 获取弧度
	return (Math.PI * degrees) / 180;
}
function initCannon() {
	world = new CANNON.World()
	world.gravity.set(0, 0, 0)
	// world.gravity.set(0, 0, -9.82)
	world.broadphase = new CANNON.NaiveBroadphase()
	world.solver.iterations = 10

	// 地面
	// const groundBody = new CANNON.Body({
	// 	mass: 0
	// })
	// const groundShape = new CANNON.Plane()
	// groundBody.addShape(groundShape)
	// world.addBody(groundBody)
}

var testBoxPosGet = new Cesium.Cartesian3()
var truckBoxPosGet = new Cesium.Cartesian3()
function entityAdd(uri, position) {
	viewer.entities.add({
		name: uri,
		position: position,
		// orientation : orientation,
		model: {
			uri
		}
	})
}
function getBoxSize(model) {
	// 获取模型尺寸
	const modelBox = new THREE.Box3()
	modelBox.expandByObject(model)
	return modelBox
}
createModel('./model/卡车/3D.gltf', Cesium.Cartesian3.fromDegrees(118.92245, 32.1033, 19.5), truckBoxPosGet).then(res => {
	truckBody = res
})
createModel('./model/变压器主体/3D.gltf', Cesium.Cartesian3.fromDegrees(118.92245, 32.1033, 20), testBoxPosGet).then(res => {
	testBody = res
})
function createModel(uri, position, bodyPosition) {

	return new Promise((resolve) => {
		let modelSize = null
		GLTFLoader.load(uri, function (gltf) {
			const model = gltf.scene
			model.rotateX(getRadian(-90))
			console.log('GLTFLoadermodel', model)
			modelSize = getBoxSize(model)

			const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)
			viewer.scene.primitives
				.add(
					Cesium.Model.fromGltf({
						url: uri,
						modelMatrix
					})
				).readyPromise.then(e => {
					if(modelSize) {
						const boundingSphere = e.boundingSphere
						boxPosition = boundingSphere.center
						meshVisualizer.worldCoordinatesToLocal(position, bodyPosition)
						const {min, max} = modelSize
						const x = max.x - min.x
						const y = max.y - min.y
						const z = max.z - min.z
						// bodyPosition.x += boxPosition.x
						const centerPosition = {
							x: (max.x + min.x) / 2,
							y: (max.y + min.y) / 2,
							z: (max.z + min.z) / 2
						}
						bodyPosition.x += centerPosition.x
						bodyPosition.y -= centerPosition.y
						bodyPosition.z -= centerPosition.z
						console.log('bodyPosition', bodyPosition)
						const modelBody = createCannonBody(bodyPosition, {
							dimensions: new Cesium.Cartesian3(x, y, z),
							material: Cesium.Color.GREEN.withAlpha(0.5)
						})
						modelBody.model = e
						resolve(modelBody)
					}
				})
				.otherwise(e => {
					console.log(e)
				})
		})
		
	})
}

function createBody(vertices, indices) {
	const shape = new CANNON.Trimesh(vertices, indices)
	const body = new CANNON.Body({ mass: 0, shape })
	return body
}

const fixedTimeStep = 1 / 60
const masSubSteps = 3
var lastTime

viewer.scene.preRender.addEventListener(function(scene, time) {
	// 监听cannon
	if (lastTime !== undefined) {
		var dt = (time - lastTime) / 1000
		world.step(fixedTimeStep, dt, masSubSteps)
	}
	if(grayBody) modelPosition(grayBody, grayBoxPosGet, time)
	if(testBody) modelPosition(testBody, testBoxPosGet, time)
	if(truckBody) modelPosition(truckBody, truckBoxPosGet, time)
	lastTime = time
})

function modelPosition(modelObj, modelPosition, time) {
	const { cannonModel, body, model } = modelObj
	cannonModel.position.getValue(time, modelPosition) // 刚体模型
	const bodyPosition = body.position
	const x = bodyPosition.x - modelPosition.x
	const y = bodyPosition.y - modelPosition.y
	const z = bodyPosition.z - modelPosition.z
	
	// 刚体
	modelPosition.x = bodyPosition.x
	modelPosition.y = bodyPosition.y
	modelPosition.z = bodyPosition.z
	
	// ------------------
	if(model) {
		// 模型偏移
		const translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(x,y,z))
		Cesium.Matrix4.multiply(model.modelMatrix, translation, model.modelMatrix)
	}
}

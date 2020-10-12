function showCoordinate (entity, position, hprRollZero) {
	var modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(position, hprRollZero, Cesium.Ellipsoid.WGS84);
	scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
		modelMatrix : modelMatrix,
		length : 20.0,
		width : 1
	}));
}
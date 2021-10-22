import { PlaneGeometry, TextureLoader, Vector3, RepeatWrapping, MathUtils, DoubleSide } from 'three'
import { Water as WaterExample } from 'three/examples/jsm/objects/Water'

export default function Water() {
    const waterGeometry = new PlaneGeometry(1000, 1000)

    const wat = new WaterExample(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new TextureLoader().load('assets/waternormals.jpg', (texture) => {
                texture.wrapS = RepeatWrapping
                texture.wrapT = RepeatWrapping
            }),
            sunDirection: new Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: true,
        },
    )

    const sun = new Vector3()

    const elevation = 3
    const azimuth = 180

    const phi = MathUtils.degToRad(90 - elevation)
    const theta = MathUtils.degToRad(azimuth)

    sun.setFromSphericalCoords(1, phi, theta)

    wat.material.uniforms.sunDirection.value.copy(sun).normalize()
    wat.material.side = DoubleSide
    wat.rotation.x = (-1 * Math.PI) / 2

    return wat
}

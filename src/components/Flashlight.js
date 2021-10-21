import { SpotLight } from 'three'

export default function Flashlight() {
    const flashLight = new SpotLight(0xffffff)

    flashLight.position.set(0, 1, 0)
    flashLight.castShadow = true
    flashLight.angle = Math.PI / 8
    flashLight.intensity = 5
    flashLight.shadow.mapSize.width = 1024
    flashLight.shadow.mapSize.height = 1024
    flashLight.shadow.camera.near = 1
    flashLight.shadow.camera.far = 1000
    flashLight.shadow.camera.fov = 30

    return flashLight
}

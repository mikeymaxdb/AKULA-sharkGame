import { AnimationMixer } from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

export default function loadFish(url, scale, timeScale = null) {
    return new Promise((resolve) => {
        new FBXLoader().load(url, (model) => {
            model.scale.setScalar(scale)

            model.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true
                    c.receiveShadow = true
                }
            })

            const mixer = new AnimationMixer(model)
            const action = mixer.clipAction(model.animations[0])
            if (timeScale) {
                action.timeScale = timeScale
            } else {
                model.speed = (Math.random() * 1.5) + 0.2
                action.timeScale = model.speed
            }
            action.play()

            model.mixer = mixer

            resolve(model)
        })
    })
}

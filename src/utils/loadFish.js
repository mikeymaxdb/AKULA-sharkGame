import { AnimationMixer } from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

const MAXPOS = 200

export default function loadFish(url, scale) {
    return new Promise((resolve) => {
        new FBXLoader().load(url, (model) => {
            model.scale.setScalar(scale)

            model.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true
                    c.receiveShadow = true
                }
            })

            model.position.set(
                (Math.random() * MAXPOS) - (MAXPOS / 2),
                (-1 * Math.random() * 50) - 7,
                (Math.random() * MAXPOS) - (MAXPOS / 2),
            )

            const mixer = new AnimationMixer(model)
            const action = mixer.clipAction(model.animations[0])
            action.timeScale = (Math.random() * 2) + 0.2
            action.play()

            model.mixer = mixer

            resolve(model)
        })
    })
}

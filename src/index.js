// Hours: 15.5

import * as THREE from 'three'

import loadFish from 'utils/loadFish'

import Flashlight from 'components/Flashlight'
import Water from 'components/Water'

import 'style.scss'

const PICKUP_TIME = 60

const INTRO_DELAY = 4000
const AVG_SWIM_DELAY = 8
const FLASHLIGHT_ANGLE = Math.PI / 6

const CHARGE_SECONDS = 5
const RECHARGE_SECONDS = 20
const AIR_SECONDS = 30
const BREATH_SECONDS = 5
const EXERCISE_FACTOR = 0.25

const SPOOK_RADIUS = 50
const DEATH_RADIUS = 20

const NUM_FISH = 120
const SHARK_START_DEPTH = -13
const SHARK_START_RADIUS = 300
const SHARK_SPEED_RAMP = 80
const SWIM_SPEED = 3
const SWIM_MAX = 1
const SWIM_MIN = -10
const PAN_SPEED = -6

const TAU = Math.PI * 2
const Y_AXIS = new THREE.Vector3(0, 1, 0)

// Rendered
let renderer
let camera
let scene
let flashLight
let water
let shark
let fishes = []

// DOM Elements
let AirStat
let ChargeStat
let FPSCounter
let Time
let BackgroundTrack
let EffectTrack

// Game state
const eventQueue = []
let state
let clock

function newSharkPosition() {
    const position = new THREE.Vector3(1, 0, 0)
    position.applyAxisAngle(Y_AXIS, Math.random() * TAU)
    position.multiplyScalar(SHARK_START_RADIUS)
    position.y = SHARK_START_DEPTH
    return position
}

function newSwimDelay() {
    return (Math.random() * AVG_SWIM_DELAY) + (AVG_SWIM_DELAY / 2)
}

function newState() {
    return {
        playerPosition: SWIM_MAX,
        playerLookAt: new THREE.Vector3(0, -10, 100),
        sharkPosition: newSharkPosition(),
        sharkTarget: new THREE.Vector3(),
        sharkSpeed: 1.3,
        panX: 0,
        swimUp: false,
        crank: false,
        gameLoopRunning: false,
        underwater: false,
        air: 100,
        charge: 100,
        timeLeft: PICKUP_TIME,
        flashLightOn: false,
        resetting: false,
        swimDelay: newSwimDelay(),
    }
}

function requestPointerLock() {
    if (state.gameLoopRunning) {
        document.getElementById('WebGLCanvas').requestPointerLock()
    }
}

function exitPointerLock() {
    document.exitPointerLock()
}

const onWindowResize = () => {
    const container = document.getElementById('GLWindow')
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    renderer.setSize(container.clientWidth, container.clientHeight)
}

const onMouseMove = (e) => {
    state.panX += e.movementX
}

const onPointerLockChange = () => {
    if (document.pointerLockElement === document.getElementById('WebGLCanvas')) {
        document.addEventListener('mousemove', onMouseMove, false)
    } else {
        document.removeEventListener('mousemove', onMouseMove, false)
    }
}

const onKeyDown = (e) => {
    switch (e.code) {
        case 'KeyW':
            state.swimUp = true
            break
        case 'KeyE':
            state.crank = true
            break
        case 'Space':
        case 'Enter':
            eventQueue.push('flashLightOn')
            break
        default:
            break
    }

    if (e instanceof window.MouseEvent) {
        eventQueue.push('flashLightOn')
    }
}

const onKeyUp = (e) => {
    switch (e.code) {
        case 'KeyW':
            state.swimUp = false
            break
        case 'KeyE':
            state.crank = false
            break
        case 'Space':
        case 'Enter':
            eventQueue.push('flashLightOff')
            break
        default:
            break
    }

    if (e instanceof window.MouseEvent) {
        eventQueue.push('flashLightOff')
    }
}

function setUpDocument() {
    window.addEventListener('resize', onWindowResize)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onKeyDown)
    document.addEventListener('mouseup', onKeyUp)

    document.getElementById('StartButton').onclick = () => eventQueue.push('gameStart')
    document.getElementById('IntroButton').onclick = () => eventQueue.push('showIntro')
    document.getElementById('RestartButton').onclick = () => eventQueue.push('restart')
    document.getElementById('PlayAgainButton').onclick = () => eventQueue.push('restart')

    AirStat = document.getElementById('AirStat')
    ChargeStat = document.getElementById('ChargeStat')
    FPSCounter = document.getElementById('FPSCounter')
    Time = document.getElementById('Time')
    BackgroundTrack = document.getElementById('BackgroundTrack')
    EffectTrack = document.getElementById('EffectTrack')
}

function setUpRenderer() {
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('WebGLCanvas'),
        antialias: true,
        shadowMap: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputEncoding = THREE.sRGBEncoding

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x002233)
    scene.fog = new THREE.FogExp2(0x002233, 0.008)

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    camera.position.set(0, state.playerPosition, 0)
    camera.lookAt(state.playerLookAt)

    scene.add(new THREE.AmbientLight(0x222222, 0.05))

    onWindowResize()
}

function loadSchoolOfFish() {
    const loadingFish = []

    for (let i = 0, max = Math.round(NUM_FISH * 0.3); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/ClownFish.fbx', 0.01))
    }

    for (let i = 0, max = Math.round(NUM_FISH * 0.3); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/TunaFish.fbx', (Math.random() * 0.02) + 0.02))
    }

    for (let i = 0, max = Math.round(NUM_FISH * 0.3); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/BrownFish.fbx', 0.02))
    }

    for (let i = 0, max = Math.round(NUM_FISH * 0.05); i < max; i += 1) {
        loadingFish.push(loadFish('assets/models/Turtle.fbx', 0.02))
    }

    Promise.all(loadingFish).then((loadedFish) => {
        fishes = loadedFish
        const position = new THREE.Vector3(1, 0, 0)
        fishes.forEach((fish) => {
            scene.add(fish)

            position.applyAxisAngle(Y_AXIS, Math.random() * TAU)

            fish.position.copy(position)
            fish.position.multiplyScalar((Math.random() * 70) + 80)
            fish.position.y = (Math.random() * -50) - 10
        })
        eventQueue.push('fishLoaded')
    })
}

function updateFish(delta) {
    const theta = Math.PI * delta * 0.01

    fishes.forEach((fish) => {
        fish.position.applyAxisAngle(Y_AXIS, theta * fish.speed)

        fish.setRotationFromAxisAngle(
            Y_AXIS, Math.atan2(fish.position.x, fish.position.z) - (Math.PI / 2),
        )

        fish.mixer.update(delta)
    })
}

function init() {
    state = newState()
    clock = new THREE.Clock()

    setUpDocument()
    setUpRenderer()

    flashLight = new Flashlight()
    scene.add(flashLight)
    scene.add(flashLight.target)
    flashLight.target.position.set(0, 0, 1000)

    water = new Water()
    scene.add(water)

    loadFish('assets/models/Shark.fbx', 0.1, 5).then((model) => {
        shark = model
        scene.add(shark)
    })

    loadSchoolOfFish()
}

function render(delta) {
    // Update FPS counter
    FPSCounter.innerHTML = Math.round(1 / delta)

    // Animate water
    water.material.uniforms.time.value += 1.0 / 60.0

    // Swim fish
    updateFish(delta)

    // Update UI
    ChargeStat.style.width = `${state.charge}%`
    AirStat.style.width = `${state.air}%`
    Time.innerHTML = Math.round(state.timeLeft)

    // Position/orient camera/flashlight
    camera.position.y = state.playerPosition
    camera.lookAt(state.playerLookAt)
    flashLight.position.copy(camera.position)
    flashLight.target.position.copy(state.playerLookAt)

    // Position/orient shark
    if (shark) {
        shark.mixer.update(delta)
        shark.position.copy(state.sharkPosition)
        shark.lookAt(state.sharkTarget)
        shark.rotateY(Math.PI)
    }

    renderer.render(scene, camera)
}

function processEvents() {
    eventQueue.forEach((event) => {
        switch (event) {
            case 'fishLoaded':
                document.getElementById('LoadingScreen').classList.add('hidden')
                document.getElementById('StartScreen').classList.remove('hidden')
                break
            case 'showIntro':
                document.getElementById('StartScreen').classList.add('hidden')
                document.getElementById('IntroScreen').classList.remove('hidden')
                window.setTimeout(() => {
                    document.getElementById('StartButton').disabled = false
                }, INTRO_DELAY)
                EffectTrack.src = 'assets/audio/intro.mp3'
                break
            case 'gameStart':
                document.getElementById('IntroScreen').classList.add('hidden')
                document.getElementById('GameScreen').classList.remove('hidden')
                state.gameLoopRunning = true
                requestPointerLock()
                document.getElementById('WebGLCanvas').addEventListener('click', requestPointerLock)
                break
            case 'death':
                document.getElementById('GameScreen').classList.add('hidden')
                document.getElementById('DeathScreen').classList.remove('hidden')
                state.gameLoopRunning = false
                // BackgroundTrack.src = 'assets/audio/scream.mp3'
                exitPointerLock()
                break
            case 'victory':
                document.getElementById('GameScreen').classList.add('hidden')
                document.getElementById('VictoryScreen').classList.remove('hidden')
                state.gameLoopRunning = false
                exitPointerLock()
                break
            case 'restart':
                document.getElementById('DeathScreen').classList.add('hidden')
                document.getElementById('VictoryScreen').classList.add('hidden')
                document.getElementById('IntroScreen').classList.remove('hidden')
                BackgroundTrack.src = 'assets/audio/waves.mp3'
                state = newState()
                break
            case 'flashLightOn':
                if (state.charge) {
                    flashLight.visible = true
                    state.flashLightOn = true
                }
                break
            case 'flashLightOff':
                flashLight.visible = false
                state.flashLightOn = false
                break
            case 'submerged':
                BackgroundTrack.src = 'assets/audio/underwater2.mp3'
                break
            case 'surfaced':
                BackgroundTrack.src = 'assets/audio/waves.mp3'
                break
            case 'sharkNear':
                window.setTimeout(() => {
                    EffectTrack.src = 'assets/audio/attack.mp3'
                }, 1000)
                break
            default:
                break
        }
    })
    eventQueue.splice(0, eventQueue.length)
}

function updateGameState(delta) {
    if (state.gameLoopRunning) {
        // Update time till rescue
        state.timeLeft = Math.max(0, state.timeLeft - delta)
        // If no time left and the shark has reset
        if (!state.timeLeft && state.swimDelay) {
            eventQueue.push('victory')
        }

        // Update vertical player position
        if (state.swimUp) {
            state.playerPosition = Math.max(SWIM_MIN, Math.min(SWIM_MAX, state.playerPosition + (SWIM_SPEED * delta)))
        } else {
            state.playerPosition = Math.max(SWIM_MIN, Math.min(SWIM_MAX, state.playerPosition - (SWIM_SPEED * delta)))
        }

        // Update shark state
        if (state.swimDelay > 0) {
            // Shark is waiting
            state.swimDelay = Math.max(0, state.swimDelay - delta)

            if (!state.swimDelay) {
                eventQueue.push('sharkNear')
            }
        } else {
            // Shark is swimming
            if (state.resetting) {
                // Shark is close enough to reset
                if (state.sharkPosition.distanceTo(state.sharkTarget) < 1) {
                    // Move shark to new starting spot
                    state.sharkPosition.copy(newSharkPosition())
                    state.swimDelay = newSwimDelay()

                    state.resetting = false
                }
            } else {
                // Set the shark target to the player position
                state.sharkTarget.set(0, state.playerPosition - 3, 0)

                // If the shark is too close
                if (state.sharkPosition.distanceTo(state.sharkTarget) < DEATH_RADIUS) {
                    eventQueue.push('death')
                } else if (state.sharkPosition.length() < SPOOK_RADIUS && state.flashLightOn) {
                    // Check flashlight angle
                    if (state.playerLookAt.angleTo(state.sharkPosition) < FLASHLIGHT_ANGLE) {
                        // Successfully spooked the shark
                        state.resetting = true
                        state.sharkTarget.copy(newSharkPosition())
                    }
                }
            }
            // Shark moves towards target
            state.sharkPosition.lerp(
                state.sharkTarget,
                (SHARK_SPEED_RAMP / state.sharkPosition.distanceTo(state.sharkTarget)) * state.sharkSpeed * delta,
            )
            // Prevent shark from surfacing
            state.sharkPosition.y = Math.min(state.sharkPosition.y, -9)
        }

        // Update player view direction
        state.playerLookAt.y = state.playerPosition - 10
        state.playerLookAt.applyAxisAngle(Y_AXIS, state.panX * (Math.PI / 180 / PAN_SPEED))
        state.panX = 0

        // Update charge based on flashlight state
        if (state.flashLightOn) {
            state.charge = Math.max(0, state.charge - ((100 / CHARGE_SECONDS) * delta))

            if (!state.charge) {
                eventQueue.push('flashLightOff')
            }
        } else if (state.crank) {
            state.charge = Math.min(100, state.charge + ((100 / RECHARGE_SECONDS) * delta))
        }

        // Update air based on player position/if cranking
        if (state.playerPosition < 0) {
            state.air = Math.max(
                0,
                // Lose air faster if cranking
                state.air - ((100 / AIR_SECONDS / (state.crank ? EXERCISE_FACTOR : 1)) * delta),
            )

            if (!state.air) {
                eventQueue.push('death')
            }
            if (!state.underwater) {
                state.underwater = true
                eventQueue.push('submerged')
            }
        } else {
            state.air = Math.min(100, state.air + ((100 / BREATH_SECONDS) * delta))
            if (state.underwater) {
                state.underwater = false
                eventQueue.push('surfaced')
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let delta

    function tick() {
        delta = clock.getDelta()

        processEvents()
        updateGameState(delta)
        render(delta)

        requestAnimationFrame(tick)
    }

    init()
    tick()
})

export const state = {
    sharkLoaded: false,
    fishLoaded: false,
    gameLoading: true,
}

export const dispatch = (action) => {
    switch (action.type) {
        case 'sharkLoaded':
            state.sharkLoaded = true
        case 'fishLoaded':
            state.fishLoaded = true
        default:
            break
    }

    if (state.fishLoaded && state.sharkLoaded) {
        state.gameLoaded = true
    }
}

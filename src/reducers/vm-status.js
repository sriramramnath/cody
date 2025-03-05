const SET_RUNNING_STATE = "scratch-gui/vm-status/SET_RUNNING_STATE";
const SET_TURBO_STATE = "scratch-gui/vm-status/SET_TURBO_STATE";
const SET_STARTED_STATE = "scratch-gui/vm-status/SET_STARTED_STATE";
const SET_FLAG_CLICKED_STATE = "scratch-gui/vm-status/SET_FLAG_CLICKED_STATE";
const SET_IS_SAVING_STATE = "scratch-gui/vm-status/SET_IS_SAVING_STATE";
const SET_IS_FIRST_STATE = "scratch-gui/vm-status/SET_IS_FIRST_STATE";
const SET_IS_SCRATCH_DATA = "scratch-gui/vm-status/SET_IS_SCRATCH_DATA";
const SET_IS_LOADING_STATE = "scratch-gui/vm-status/SET_IS_LOADING_STATE";
const SET_SPRITE_CLICKED_STATE =
    "scratch-gui/vm-status/SET_SPRITE_CLICKED_STATE";
const SET_COSTUME_URL_STATE = "scratch-gui/vm-status/SET_COSTUME_URL_STATE";
const SET_AUTO_SAVE_STATE = "scratch-gui/vm-status/SET_AUTO_SAVE_STATE";

const initialState = {
    running: false,
    started: false,
    turbo: false,
    flagClicked: false,
    spriteClicked: false,
    autoSave: false,
    costumeURLFax: "",
    isSaving: false,
    isFirst: true,
    isScratchData: "",
    isLoading: false,
};

const reducer = function (state, action) {
    if (typeof state === "undefined") state = initialState;
    switch (action.type) {
        case SET_STARTED_STATE:
            return Object.assign({}, state, {
                started: action.started,
            });
        case SET_RUNNING_STATE:
            return Object.assign({}, state, {
                running: action.running,
            });
        case SET_TURBO_STATE:
            return Object.assign({}, state, {
                turbo: action.turbo,
            });
        case SET_FLAG_CLICKED_STATE:
            return Object.assign({}, state, {
                flagClicked: action.flagClicked,
            });
        case SET_IS_SAVING_STATE:
            return Object.assign({}, state, {
                isSaving: action.isSaving,
            });
        case SET_IS_FIRST_STATE:
            return Object.assign({}, state, {
                isFirst: action.isFirst,
            });
        case SET_IS_SCRATCH_DATA:
            return Object.assign({}, state, {
                isScratchData: action.isScratchData,
            });
        case SET_IS_LOADING_STATE:
            return Object.assign({}, state, {
                isLoading: action.isLoading,
            });
        case SET_SPRITE_CLICKED_STATE:
            return Object.assign({}, state, {
                spriteClicked: action.spriteClicked,
            });
        case SET_AUTO_SAVE_STATE:
            return Object.assign({}, state, {
                autoSave: action.autoSave,
            });
        case SET_COSTUME_URL_STATE:
            return Object.assign({}, state, {
                costumeURLFax: action.costumeURLFax,
            });
        default:
            return state;
    }
};

const setStartedState = function (started) {
    return {
        type: SET_STARTED_STATE,
        started: started,
    };
};

const setRunningState = function (running) {
    return {
        type: SET_RUNNING_STATE,
        running: running,
    };
};

const setTurboState = function (turbo) {
    return {
        type: SET_TURBO_STATE,
        turbo: turbo,
    };
};

const setFlagClickedState = function (flagClicked) {
    return {
        type: SET_FLAG_CLICKED_STATE,
        flagClicked: flagClicked,
    };
};

const setIsSavingState = function (isSaving) {
    return {
        type: SET_IS_SAVING_STATE,
        isSaving: isSaving,
    };
};

const setIsFirstState = function (isFirst) {
    return {
        type: SET_IS_FIRST_STATE,
        isFirst: isFirst,
    };
};

const setIsScratchData = function (isScratchData) {
    return {
        type: SET_IS_SCRATCH_DATA,
        isScratchData: isScratchData,
    };
};

const setIsLoadingState = function (isLoading) {
    return {
        type: SET_IS_LOADING_STATE,
        isLoading: isLoading,
    };
};

const setSpriteClickedState = function (spriteClicked) {
    return {
        type: SET_SPRITE_CLICKED_STATE,
        spriteClicked: spriteClicked,
    };
};

const setAutoSaveState = function (autoSave) {
    return {
        type: SET_AUTO_SAVE_STATE,
        autoSave: autoSave,
    };
};

const setCostumeClickedState = function (costumeURLFax) {
    return {
        type: SET_COSTUME_URL_STATE,
        costumeURLFax: costumeURLFax,
    };
};

export {
    reducer as default,
    initialState as vmStatusInitialState,
    setRunningState,
    setStartedState,
    setTurboState,
    setFlagClickedState,
    setIsSavingState,
    setIsFirstState,
    setIsScratchData,
    setIsLoadingState,
    setSpriteClickedState,
    setCostumeClickedState,
    setAutoSaveState,
};

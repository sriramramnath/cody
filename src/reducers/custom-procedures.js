const ACTIVATE_CUSTOM_PROCEDURES =
    "scratch-gui/custom-procedures/ACTIVATE_CUSTOM_PROCEDURES";
const DEACTIVATE_CUSTOM_PROCEDURES =
    "scratch-gui/custom-procedures/DEACTIVATE_CUSTOM_PROCEDURES";
const SET_CALLBACK = "scratch-gui/custom-procedures/SET_CALLBACK";

const initialState = {
    active: false,
    mutator: null,
    callback: null,
    lastMutator: null,
};

const reducer = function (state = initialState, action) {
    switch (action.type) {
        case ACTIVATE_CUSTOM_PROCEDURES:
            return {
                ...state,
                active: true,
                mutator: action.mutator,
                callback: action.callback,
            };

        case DEACTIVATE_CUSTOM_PROCEDURES:
            return {
                ...state,
                active: false,
                mutator: null,
                callback: null,
                lastMutator: action.mutator,
            };

        case SET_CALLBACK:
            return {
                ...state,
                callback: action.callback,
            };

        default:
            return state;
    }
};

const activateCustomProcedures = (mutator, callback) => ({
    type: ACTIVATE_CUSTOM_PROCEDURES,
    mutator,
    callback,
});

const deactivateCustomProcedures = (mutator) => ({
    type: DEACTIVATE_CUSTOM_PROCEDURES,
    mutator,
});

export {
    reducer as default,
    initialState as customProceduresInitialState,
    activateCustomProcedures,
    deactivateCustomProcedures,
};

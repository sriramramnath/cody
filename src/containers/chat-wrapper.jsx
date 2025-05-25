import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import ChatWrapperComponent from '../components/chat-wrapper/chat-wrapper.jsx';

const ChatWrapper = props => <ChatWrapperComponent {...props} />;

ChatWrapper.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired,
    className: PropTypes.string
};

export default ChatWrapper;

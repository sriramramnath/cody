import PropTypes from 'prop-types';
import React, {useEffect, useState} from 'react';
import {connect} from 'react-redux';
import VM from 'scratch-vm';
import ChatWrapperComponent from '../components/chat-wrapper/chat-wrapper.jsx';
import MCPServer from '../lib/mcp-server';
import MCPVMBridge from '../lib/mcp-vm-bridge';
import deepseekAPI from '../lib/deepseek-api';

const ChatWrapper = props => {
    const {vm} = props;
    const [mcpServer, setMCPServer] = useState(null);
    
    // Initialize MCP Server on component mount
    useEffect(() => {
        if (vm) {
            const vmBridge = new MCPVMBridge(vm);
            // 不再需要传递blocks，从MCP服务器直接获取blocks
            const server = new MCPServer(vm, null, { vmBridge });
            
            // Register the MCP server with the DeepSeek API
            deepseekAPI.setMCPServer(server);
            
            setMCPServer(server);
            
            console.log('MCP Server initialized and registered with DeepSeek API');
        }
    }, [vm]);
    
    return <ChatWrapperComponent 
        {...props} 
        mcpServer={mcpServer}
    />;
};

ChatWrapper.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired,
    className: PropTypes.string
};

const mapStateToProps = state => ({
    // 移除对已删除的blocks reducer的引用
    vm: state.scratchGui.vm
});

export default connect(mapStateToProps)(ChatWrapper);

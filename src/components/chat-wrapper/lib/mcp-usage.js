/**
 * MCP Server Usage Examples
 *
 * This file provides examples of how to use the MCP Server with DeepSeek API.
 * These are demonstrations of the tool calling format that DeepSeek would use.
 */

// Example 1: Create a simple Scratch project with a moving sprite
const createMovingCatExample = {
    messages: [
        {
            role: 'user',
            content: 'Please create a simple animation with a cat moving across the screen'
        }
    ],
    choices: [
        {
            message: {
                role: 'assistant',
                content: "I'll help you create a simple animation with a cat moving across the screen. I'll do this step-by-step:",
                tool_calls: [
                    {
                        id: 'call_123',
                        name: 'getProjectInfo',
                        arguments: '{}'
                    }
                ]
            }
        }
    ]
};

// Example 2: Tool response and follow-up tool call
const toolResponseAndFollowUp = {
    messages: [
        // Previous messages...
    ],
    choices: [
        {
            message: {
                role: 'assistant',
                content: "Now I'll add the movement blocks to make the cat walk across the screen.",
                tool_calls: [
                    {
                        id: 'call_456',
                        name: 'createBlock',
                        arguments: '{ "blockType": "motion_movesteps", "inputs": { "STEPS": 10 } }'
                    }
                ]
            }
        }
    ]
};

// Example 3: Final completion after multiple tool calls
const finalCompletionExample = {
    messages: [
        // All previous messages and tool calls...
        {
            role: 'tool',
            name: 'createBlock',
            content: '{ "success": true, "blockId": "abc123", "message": "Created motion_movesteps block with ID abc123" }',
            tool_call_id: 'call_456'
        }
    ],
    choices: [
        {
            message: {
                role: 'assistant',
                content: "Great! I've created a simple animation with a cat moving across the screen. Here's what I did:\n\n1. Created a motion block that makes the cat move 10 steps at a time\n2. Set up the script to run when the green flag is clicked\n\nYou can see the cat moving from left to right now. If you want the cat to bounce when it reaches the edge, I can add that functionality too. Would you like me to modify the script to make the cat bounce at the edges of the screen?"
            }
        }
    ]
};

// Example 4: A more complex script with multiple blocks
const complexScriptExample = {
    choices: [
        {
            message: {
                role: 'assistant',
                content: "I'll create a more complex script that makes the cat move in a square pattern.",
                tool_calls: [
                    {
                        id: 'call_square1',
                        name: 'createBlock',
                        arguments: '{ "blockType": "event_whenflagclicked", "position": { "x": 0, "y": 0 } }'
                    },
                    {
                        id: 'call_square2',
                        name: 'createBlock',
                        arguments: '{ "blockType": "control_repeat", "inputs": { "TIMES": 4 }, "position": { "x": 0, "y": 40 } }'
                    },
                    {
                        id: 'call_square3',
                        name: 'createBlock',
                        arguments: '{ "blockType": "motion_movesteps", "inputs": { "STEPS": 100 }, "position": { "x": 0, "y": 80 } }'
                    },
                    {
                        id: 'call_square4',
                        name: 'createBlock',
                        arguments: '{ "blockType": "motion_turnright", "inputs": { "DEGREES": 90 }, "position": { "x": 0, "y": 120 } }'
                    },
                    {
                        id: 'call_connect1',
                        name: 'connectBlocks',
                        arguments: '{ "sourceBlockId": "flag_block_id", "targetBlockId": "repeat_block_id" }'
                    }
                ]
            }
        }
    ]
};

// Note: These examples are for illustrative purposes only.
// The actual integration will use the real DeepSeek API responses.
export default {
    createMovingCatExample,
    toolResponseAndFollowUp,
    finalCompletionExample,
    complexScriptExample
};

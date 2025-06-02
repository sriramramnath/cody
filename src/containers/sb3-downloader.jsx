import bindAll from 'lodash.bindall'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { projectTitleInitialState } from '../reducers/project-title'
import downloadBlob from '../lib/download-blob'
import localforage from 'localforage'
import { setIsSavingState, setIsScratchData, setIsSavingStateStatus, setIsPendingState, setProjectName } from './../reducers/vm-status.js'
import { set } from 'core-js/core/dict'
/**
 * Project saver component passes a downloadProject function to its child.
 * It expects this child to be a function with the signature
 *     function (downloadProject, props) {}
 * The component can then be used to attach project saving functionality
 * to any other component:
 *
 * <SB3Downloader>{(downloadProject, props) => (
 *     <MyCoolComponent
 *         onClick={downloadProject}
 *         {...props}
 *     />
 * )}</SB3Downloader>
 */
class SB3Downloader extends React.Component {
  constructor(props) {
    super(props)
    this.abortController = null
    this.debounceTimeout = null
    this.previousBase64 = null
    bindAll(this, ['downloadProject', 'downloadLocalStorageProject'])
  }
  downloadProject() {
    this.props.saveProjectSb3().then((content) => {
      if (this.props.onSaveFinished) {
        this.props.onSaveFinished()
      }
      downloadBlob(this.props.projectFilename, content)
    })
  }
  downloadLocalStorageProject = async () => {
    const url = new URLSearchParams(window.location.search)

    const projectId = url.get('projectid')
    const currentprojectName = url.get('projectname')
    const inputLayout = url.get('inputLayout')
    const fetchapiurl = url.get('fetchapiurl');
    if(currentprojectName){
      this.props.setProjectName(currentprojectName)
    }
    if (inputLayout === 'myprojects') {
      if (this.props.isFirst) {
        return
      }
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout)
      }
      this.props.setIsPendingState(true)
      this.debounceTimeout = setTimeout(async () => {
        if (this.abortController) {
          this.abortController.abort()
        }

        this.abortController = new AbortController()
        const signal = this.abortController?.signal

        this.props.saveProjectSb3().then((content) => {
          if (this.props.onSaveFinished) {
            this.props.onSaveFinished()
          }

          const reader = new FileReader()
          reader.onloadend = async () => {
            const buffer = reader.result
            // const binaryString = Array.prototype.map
            //   .call(new Uint8Array(buffer), (x) => String.fromCharCode(x))
            //   .join('')
            let base64blocks = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
            )

            if (this.previousBase64 === base64blocks) {
              return
            }
            this.previousBase64 = base64blocks

            console.log('scratch project name ',this.props.projectName)

            const structure = {
              name: this.props.projectName,
              projectType: 'scratch',
              content: base64blocks,
            }

            const structureString = JSON.stringify(structure)

            const apiUrl = `${fetchapiurl}/projects/${projectId}`
      
            try {
              if(!this.props.projectName || !currentprojectName) {
                return
              }
              this.props.setIsSavingState(true)
              this.props.setIsSavingStateStatus('Saving project')
              await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: structureString,
                credentials: 'include',
                signal,
              })
              this.props.setIsSavingStateStatus('Project saved successfully')
              this.props.setIsPendingState(false)
            } catch (error) {
              this.props.setIsSavingStateStatus('Error saving project')
              this.props.setIsPendingState(false)
            } finally {
              this.props.setIsSavingState(false)
              setTimeout(() => {
                this.props.setIsSavingStateStatus('')
              }, 2000)
            }
          }
          reader.readAsArrayBuffer(content)
        })
      }, 5000)
    } else {
      const projectName = await localforage.getItem('Current_Project_Name')
      this.props.saveProjectSb3().then((content) => {
        if (this.props.onSaveFinished) {
          this.props.onSaveFinished()
        }
        const reader = new FileReader()
        reader.onloadend = async () => {
          const buffer = reader.result
          const binaryString = Array.prototype.map
            .call(new Uint8Array(buffer), (x) => String.fromCharCode(x))
            .join('')
          let base64blocks = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
          )
          this.props.setIsScratchData(base64blocks)
          await localforage.setItem(projectName, binaryString)
          await localforage.setItem('assignmentProgress', base64blocks)
        }
        reader.readAsArrayBuffer(content)
      })
    }
  }

  render() {
    const { children } = this.props
    return children(this.props.className, this.downloadProject, this.downloadLocalStorageProject)
  }
}

const getProjectFilename = (curTitle, defaultTitle) => {
  let filenameTitle = curTitle
  if (!filenameTitle || filenameTitle.length === 0) {
    filenameTitle = defaultTitle
  }
  return `${filenameTitle.substring(0, 100)}.sb3`
}

SB3Downloader.propTypes = {
  children: PropTypes.func,
  className: PropTypes.string,
  onSaveFinished: PropTypes.func,
  projectFilename: PropTypes.string,
  saveProjectSb3: PropTypes.func,
}
SB3Downloader.defaultProps = {
  className: '',
}

const mapStateToProps = (state) => ({
  saveProjectSb3: state.scratchGui.vm.saveProjectSb3.bind(state.scratchGui.vm),
  isFirst: state.scratchGui.vmStatus.isFirst,
  projectFilename: getProjectFilename(state.scratchGui.projectTitle, projectTitleInitialState),
  projectName: state.scratchGui.vmStatus.projectName,
})

const mapDispatchToProps = {
  setIsSavingState,
  setIsScratchData,
  setIsSavingStateStatus,
  setIsPendingState,
  setProjectName,
}

export default connect(mapStateToProps, mapDispatchToProps)(SB3Downloader)

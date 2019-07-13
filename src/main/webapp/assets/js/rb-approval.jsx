/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
// 审批流程
class ApprovalProcessor extends React.Component {
  constructor(props) {
    super(props)
    this.state = { ...props }
  }

  render() {
    return (<div className="approval-pane">
      {this.state.state === 1 && this.renderStateDraft()}
      {this.state.state === 2 && this.renderStateProcessing()}
      {this.state.state === 10 && this.renderStateApproved()}
      {this.state.state === 11 && this.renderStateRejected()}
    </div>)
  }

  renderStateDraft() {
    return (<div className="alert alert-warning">
      <button className="close btn btn-secondary" onClick={this.submit}>提交</button>
      <div className="icon"><span className="zmdi zmdi-info-outline"></span></div>
      <div className="message">当前记录尚未提交审批，请在信息完善后尽快提交</div>
    </div>)
  }

  renderStateProcessing() {
    return (<div className="alert alert-warning">
      <button className="close btn btn-secondary" onClick={this.viewSteps}>详情</button>
      {(this.state.imApprover && this.state.imApproveSatate === 1) && <button className="close btn btn-secondary" onClick={this.approve}>审批</button>}
      <div className="icon"><span className="zmdi zmdi-hourglass-alt"></span></div>
      <div className="message">当前纪录正在审批中</div>
    </div>)
  }

  renderStateApproved() {
    return (<div className="alert alert-success">
      <button className="close btn btn-secondary" onClick={this.viewSteps}>详情</button>
      <div className="icon"><span className="zmdi zmdi-check"></span></div>
      <div className="message">当前记录已审批完成</div>
    </div>)
  }

  renderStateRejected() {
    return (<div className="alert alert-danger">
      <button className="close btn btn-secondary" onClick={this.viewSteps}>详情</button>
      <button className="close btn btn-secondary" onClick={this.approve}>再次提交</button>
      <div className="icon"><span className="zmdi zmdi-close-circle-o"></span></div>
      <div className="message">审批被驳回，可在信息完善后再次提交</div>
    </div>)
  }

  componentDidMount() {
    $.get(`${rb.baseUrl}/app/entity/approval/state?record=${this.props.id}`, (res) => {
      this.setState(res.data)
    })
  }

  submit = () => {
    if (this._submitForm) this._submitForm.show()
    else this._submitForm = renderRbcomp(<SubmitForm id={this.props.id} />)
  }
  approve = () => {
    if (this._approveForm) this._approveForm.show()
    else this._approveForm = renderRbcomp(<ApproveForm id={this.props.id} approval={this.state.approvalId} />)
  }
  viewSteps = () => {
    if (this._stepViewer) this._stepViewer.show()
    else this._stepViewer = renderRbcomp(<ApprovedStepViewer id={this.props.id} approval={this.state.approvalId} />)
  }
}

// 审批人/抄送人选择
class ApprovalUsersForm extends RbFormHandler {
  constructor(props) {
    super(props)
  }

  renderUsers() {
    let approverHas = (this.state.nextApprovers || []).length > 0 || this.state.approverSelfSelecting
    let ccHas = (this.state.nextCcs || []).length > 0 || this.state.ccSelfSelecting
    return (<div>
      {approverHas && <div className="form-group">
        <label><i className="zmdi zmdi-account zicon" /> {`${this._approverLabel || '审批人'} (${this.state.signMode === 'AND' ? '会签' : '或签'})`}</label>
        <div>
          {(this.state.nextApprovers || []).map((item) => {
            return <UserShow key={'AU' + item[0]} id={item[0]} name={item[1]} showName={true} />
          })}
        </div>
        {this.state.approverSelfSelecting && <div>
          <UserSelector ref={(c) => this._approverSelect = c} />
        </div>}
      </div>}
      {ccHas && <div className="form-group">
        <label><i className="zmdi zmdi-mail-send zicon" /> 本次审批结果将抄送给</label>
        <div>
          {(this.state.nextCcs || []).map((item) => {
            return <UserShow key={'CU' + item[0]} id={item[0]} name={item[1]} showName={true} />
          })}
        </div>
        {this.state.ccSelfSelecting && <div>
          <UserSelector ref={(c) => this._ccSelect = c} />
        </div>}
      </div>}
    </div>)
  }

  getSelectUsers() {
    let selectUsers = {
      selectApprovers: this.state.approverSelfSelecting ? this._approverSelect.getSelected() : [],
      selectCcs: this.state.ccSelfSelecting ? this._ccSelect.getSelected() : []
    }
    if (this.state.isLastStep !== true) {
      if ((this.state.nextApprovers || []).length === 0 && selectUsers.selectApprovers.length === 0) {
        rb.highbar('请选择审批人')
        return false
      }
    }
    return selectUsers
  }

  getNextStep(approval) {
    $.get(`${rb.baseUrl}/app/entity/approval/fetch-nextstep?record=${this.props.id}&approval=${approval || this.props.approval}`, (res) => {
      this.setState(res.data)
    })
  }
}

// 提交
class SubmitForm extends ApprovalUsersForm {
  constructor(props) {
    super(props)
    this.state.approvals = []
  }

  render() {
    return <RbModal ref={(c) => this._dlg = c} title="提交审批" width="600">
      <div className="form approval-form">
        <div className="form-group">
          <label>选择审批流程</label>
          <div className="approval-list">
            {!this.state.approvals && <strong className="text-danger">无可用流程，请联系管理员配置</strong>}
            {(this.state.approvals || []).map((item) => {
              return (<div key={'A' + item.id}>
                <label className="custom-control custom-control-sm custom-radio mb-0">
                  <input className="custom-control-input" type="radio" name="useApproval" value={item.id} onChange={this.handleChange} checked={this.state.useApproval === item.id} />
                  <span className="custom-control-label">{item.name}</span>
                </label>
                <a href={`${rb.baseUrl}/p/commons/approval-preview?id=${item.id}`} target="_blank">流程详情</a>
              </div>)
            })}
          </div>
        </div>
        {this.renderUsers()}
        <div className="dialog-footer" ref={(c) => this._btns = c}>
          <button type="button" className="btn btn-primary btn-space" onClick={() => this.post()}>提交</button>
          <button type="button" className="btn btn-secondary btn-space" onClick={this.hide}>取消</button>
        </div>
      </div>
    </RbModal >
  }

  componentDidMount() {
    $.get(`${rb.baseUrl}/app/entity/approval/workable?record=${this.props.id}`, (res) => {
      if (res.data && res.data.length > 0) {
        this.setState({ approvals: res.data, useApproval: res.data[0].id }, () => {
          this.getNextStep(res.data[0].id)
        })
      } else {
        this.setState({ approvals: null, useApproval: null })
      }
    })
  }

  handleChangeAfter(id, val) {
    if (id === 'useApproval') this.getNextStep(val)
  }

  post() {
    if (!this.state.useApproval) {
      rb.highbar('无可用流程，请联系管理员配置')
      return
    }
    let selectUsers = this.getSelectUsers()
    if (!selectUsers) return

    this.disabled(true)
    $.post(`${rb.baseUrl}/app/entity/approval/submit?record=${this.props.id}&approval=${this.state.useApproval}`, JSON.stringify(selectUsers), (res) => {
      if (res.error_code > 0) rb.hberror(res.error_msg)
      else {
        rb.hbsuccess('审批已提交')
        setTimeout(() => {
          if (window.RbViewPage) window.RbViewPage.reload()
          else location.reload()
        }, 1000)
      }
      this.disabled()
    })
  }
}

// 审批
class ApproveForm extends ApprovalUsersForm {
  constructor(props) {
    super(props)
    this._approverLabel = '下一审批人'
  }

  render() {
    return <RbModal ref={(c) => this._dlg = c} title="审批" width="600">
      <div className="form approval-form">
        <div className="form-group">
          <label>批注</label>
          <textarea className="form-control form-control-sm row3x" name="remark" placeholder="输入批注 (可选)" value={this.state.remark || ''} onChange={this.handleChange} />
        </div>
        {this.renderUsers()}
        <div className="dialog-footer">
          <button type="button" className="btn btn-primary btn-space" onClick={() => this.post(10)}>同意</button>
          <button type="button" className="btn btn-danger bordered btn-space" onClick={() => this.post(11)}>驳回</button>
        </div>
      </div>
    </RbModal>
  }

  componentDidMount() {
    this.getNextStep()
  }

  post(state) {
    let selectUsers = this.getSelectUsers()
    if (!selectUsers) return
    let pdata = { remark: this.state.remark || '', selectUsers: selectUsers }

    this.disabled(true)
    $.post(`${rb.baseUrl}/app/entity/approval/approve?record=${this.props.id}&state=${state}`, JSON.stringify(pdata), (res) => {
      if (res.error_code > 0) rb.hberror(res.error_msg)
      else {
        rb.hbsuccess('审批已' + (state === 10 ? '同意' : '驳回'))
        setTimeout(() => {
          if (window.RbViewPage) window.RbViewPage.reload()
          else location.reload()
        }, 1000)
      }
      this.disabled()
    })
  }
}

class ApprovedStepViewer extends React.Component {
  constructor(props) {
    super(props)
    this.state = { ...props }
  }

  render() {
    return (
      <div className="modal" ref={(c) => this._dlg = c} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header pb-0">
              <button className="close" type="button" onClick={this.hide}><span className="zmdi zmdi-close" /></button>
            </div>
            <div className="modal-body approved-steps-body">
              {!this.state.steps && <RbSpinner fully={true} />}
              <ul className="timeline approved-steps">
                {(this.state.steps || []).map((item, idx) => {
                  return idx === 0 ? this.renderSubmitter(item, idx) : this.renderApprovers(item, idx)
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderSubmitter(s, idx) {
    return <li className="timeline-item" key={`step-${idx}`}>
      {this.__formatTime(s.createdOn)}
      <div className="timeline-content">
        <div className="timeline-avatar"><img src={`${rb.baseUrl}/account/user-avatar/${s.submitter}`} /></div>
        <div className="timeline-header">
          <p className="timeline-activity">由 {s.submitterName} 提交审核</p>
        </div>
      </div>
    </li>
  }
  renderApprovers(s, idx) {
    let k = 'step-' + idx + '-'
    return <div key={k}>
      {s.map((item, idx2) => {
        let aMsg = `等待 ${item.approverName} 审批`
        if (item.state >= 10) aMsg = `由 ${item.approverName} ${item.state === 10 ? '审批同意' : '驳回审批'}`
        return <li className={'timeline-item state' + item.state} key={k + idx2}>
          {this.__formatTime(item.approvedTime || item.createdOn)}
          <div className="timeline-date">{}</div>
          <div className="timeline-content">
            <div className="timeline-avatar"><img src={`${rb.baseUrl}/account/user-avatar/${item.approver}`} /></div>
            <div className="timeline-header">
              <p className="timeline-activity">{aMsg}</p>
            </div>
          </div>
        </li>
      })}
    </div>
  }

  __formatTime(time) {
    time = time.split(' ')
    return <div className="timeline-date">{time[1]}<span>{time[0]}</span></div>
  }

  componentDidMount() {
    this.show()
    $.get(`${rb.baseUrl}/app/entity/approval/fetch-workedsteps?record=${this.props.id}`, (res) => {
      if (!res.data || res.data.length === 0) {
        rb.highbar('未查询到流程详情')
        this.hide()
        this.__noStepFound = true
      } else this.setState({ steps: res.data })
    })
  }

  hide = () => $(this._dlg).modal('hide')
  show = () => {
    if (this.__noStepFound === true) {
      rb.highbar('未查询到流程详情')
      this.hide()
    } else $(this._dlg).modal({ show: true, keyboard: true })
  }
}
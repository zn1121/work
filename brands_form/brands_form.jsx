import React from 'react';
import axios from 'axios'
import styles from './brands_form.css';
import { Input, Card, Button, Upload, Icon, message, Form, Breadcrumb } from 'antd';
import Zmage from 'react-zmage'

import BraftEditor from 'braft-editor'
import 'braft-editor/dist/index.css'
const { Dragger } = Upload;
class Brands_form extends React.Component {
  state = {
    // 创建一个空的editorState作为初始值
    editorState: BraftEditor.createEditorState()
  }
  constructor() {
    super();
    this.state = {
      formLayout: 'horizontal',
      display: 'none',//,'block'控制logo的
      display:'block',//控制上传是否显示的
      text: '',//简介
      logo: '',//图片
      company_name: '',//名称
      company: '',//所属公司
      website: '',//官网
      account: '',//实时账户
      bank_t: '',//收款银行
      bank_account: '',//收款银行账户
      fileList: [],
      uploading: false,
      t: '',
      id: '',//品牌的id
    };
    // this.handleChange = this.handleChange.bind(this)
    this.brands_submit = this.brands_submit.bind(this)
  }
  componentDidMount() {
    this.state.id = this.props.location.state.id;
    // console.log("这个是传过来的值", this.props.location.state)
    axios.get('/api/brand_form_id', {
      params: {
        data: this.state.id
      }
    }).then((res) => {
      if (res.data[0].logo && res.data[0].logo !== null) {//这个if是判断是否有logo并且设置是否显示
        this.setState({
          display: "block",
          display_none:"none",
          logo: res.data[0].logo.url,
        })
      } else {
        this.setState({
          display_none:"block",
          display: "none"
        })
      }
      this.setState({
        t: res.data[0].t,
        company_name: res.data[0].t,//名称
        company: res.data[0].company,//所属公司
        editorState: BraftEditor.createEditorState(res.data[0].d),//简介
        website: res.data[0].website,//官网
        account: res.data[0].account,//实时账户
        bank_t: res.data[0].bank.t,//收款银行
        bank_account: res.data[0].bank.account,//收款银行账户
      })
    })
  }

  handleEditorChange = (editorState) => {//这个是检测富文本的
    this.state.text = editorState.toHTML()
  }

  handleChange = info => {//这个是拖拽上传
    this.setState({
      logo: info.file.response
    })
  };

  brands_submit() {//这个是保存的
    let t = this.state.company_name;
    let company = this.state.company;
    if (t && company) {
      let api = "/api/brands_form_update";
      axios.post(api, {
        id: this.state.id,
        logo: this.state.logo,
        t: this.state.company_name,
        d: this.state.text,
        company: this.state.company,
        website: this.state.website,
        account: this.state.account,
        bank: {
          t: this.state.bank_t,
          account: this.state.bank_account
        }

      })
        .then((response) => {
          // console.log("这个是提交按钮的返回值", response);
          if (response.status == 200) {
            message.success('保存成功！',1.5);
            this.props.history.push('/brands')
          }
          // this.setState({
          //     stores_data: response.data
          // })
        }).catch(function (error) {
          console.log(error);
          message.error('新建失败！',1.5);
        });
    } else if (t == "" && company == "") {
      message.error('请输入名称及所属公司！',1.5);
    } else if (company == "") {
      message.error('请输入所属公司！',1.5);
    } else if (t == "") {
      message.error('请输入公司名称！',1.5);
    }

  }
  render() {
    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 8 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
      },
    };
    const { editorState } = this.state
    return (
      <div>

        <div className={styles.bg}>

          <Card bordered={false}>
            <Breadcrumb separator=">" className={styles.bread}>
              <Breadcrumb.Item href="http://localhost:8001/brands"><Icon type="bold" />品牌管理</Breadcrumb.Item>
              <Breadcrumb.Item>{this.state.t}</Breadcrumb.Item>
            </Breadcrumb>
            <Form layout={formItemLayout}>
              <Form.Item label="Logo" >
                <Card bordered={false}>
                  <div style={{ display: this.state.display }} className={styles.logo}>
                    <Icon type="close" className={styles.ico} onClick={() => {
                      this.setState({
                        logo: "",
                        display: "none",
                        display_none:"block"
                      })
                    }} />
                    <div>
                      <Zmage src={this.state.logo} alt="" width="317px" />
                    </div>
                  </div>
                </Card>

                <div className="dropbox" style = {{display: this.state.display_none}}>
                  <Dragger
                    name="img_flie"
                    action="/api/brands_upload"
                    name="file"
                    onChange={this.handleChange}
                  >
                    <p className="ant-upload-drag-icon">
                      <Icon type="inbox" />
                    </p>
                    <p className="ant-upload-hint">
                      点击/拖拽上传logo
                      (以最后一张有效)
                    </p>
                  </Dragger>

                </div>
              </Form.Item>
              <Form.Item label="* 名称" >
                <Input
                  value={this.state.company_name}
                  onChange={(e) => {
                    this.setState({
                      company_name: e.target.value
                    })
                  }}
                />
              </Form.Item>
              <Form.Item label="简介" >
                <BraftEditor
                  value={editorState}
                  onChange={this.handleEditorChange}
                  onSave={this.submitContent}
                />
              </Form.Item>
              <Form.Item label="* 所属公司" >
                <Input
                  value={this.state.company}
                  onChange={(e) => {
                    this.setState({
                      company: e.target.value
                    })
                  }}
                />
              </Form.Item>
              <Form.Item label="官网" >
                <Input
                  value={this.state.website}
                  onChange={(e) => {
                    this.setState({
                      website: e.target.value
                    })
                  }}
                />
              </Form.Item>
              <Form.Item label="实时收款账户" >
                <Input
                  value={this.state.account}
                  onChange={(e) => {
                    this.setState({
                      account: e.target.value
                    })
                  }}
                />
              </Form.Item>
              <Form.Item label="收款银行" >
                <Input
                  value={this.state.bank_t}
                  onChange={(e) => {
                    this.setState({
                      bank_t: e.target.value
                    })
                  }}
                />
              </Form.Item>
              <Form.Item label="收款银行账户" >
                <Input
                  value={this.state.bank_account}
                  onChange={(e) => {
                    this.setState({
                      bank_account: e.target.value
                    })
                  }}
                />
              </Form.Item>
              <Form.Item style={{ textAlign: "center" }}>
                <Button type="primary" className={styles.btn} onClick={this.brands_submit}>提交</Button>

                <Button onClick={() => {
                  message.success('取消编辑!',1.5);
                  this.props.history.push('/brands')
                }}>取消</Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    );
  }
}
export default Brands_form;
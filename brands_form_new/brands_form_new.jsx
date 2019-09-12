import React from 'react';
import axios from 'axios'
import styles from './brands_form_new.css';
import { Input, Card, Button, Upload, Icon, message, Form, Breadcrumb } from 'antd';


import BraftEditor from 'braft-editor'
import 'braft-editor/dist/index.css'
const { Dragger } = Upload;

class brands_form_new extends React.Component {
    state = {
        // 创建一个空的editorState作为初始值
        editorState: BraftEditor.createEditorState()
    }
    constructor() {
        super();
        this.state = {
            formLayout: 'horizontal',
            display: 'none',//,'block'
            display_none: "block",//这个是控制上传是否显示的
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
        };
        this.brands_submit = this.brands_submit.bind(this)
    }
    handleEditorChange = (editorState) => {//这个是检测富文本的
        this.state.text = editorState.toHTML()
    }
    handleChange = info => {//这个是拖拽上传
        this.setState({
            logo: info.file.response
        })
    };
    brands_submit() {//这个是新建的
        let t = this.state.company_name;
        let company = this.state.company;
        console.log("这个是提交的t", t)
        console.log("这个是提交的company", company)
        console.log("这个是提交的名称", this.state.company_name)
        console.log("这个是提交的所属公司", this.state.company)

        if (t && company) {
            let api = "/api/brands_new";
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
                    if (response.status == 200) {
                        message.success('新建成功！',1.5);
                        this.props.history.push('/brands')
                    }
                }).catch(function (error) {
                    console.log(error);
                    message.error('新建失败！',1.5);
                });
        } else if (t == "" && company == "") {
            message.error('请输入名称及所属公司！');
        } else if (company == "") {
            message.error('请输入所属公司！');
        } else if (t == "") {
            message.error('请输入公司名称！');
        }



        // let api = "/api/brands_new";
        // axios.post(api, {
        //     id: this.state.id,
        //     logo: this.state.logo,
        //     t: this.state.company_name,
        //     d: this.state.text,
        //     company: this.state.company,
        //     website: this.state.website,
        //     account: this.state.account,
        //     bank: {
        //         t: this.state.bank_t,
        //         account: this.state.bank_account
        //     }
        // })
        //     .then((response) => {
        //         if (response.status == 200) {
        //             message.success('新建成功！');
        //             this.props.history.push('/brands')
        //         }
        //     }).catch(function (error) {
        //         console.log(error);
        //         message.error('新建失败！');
        //     });
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
        // const { getFieldDecorator } = this.props.form;
        return (
            <div>
                <div className={styles.bg}>
                    <Card bordered={false}>
                        <Breadcrumb separator=">" className={styles.bread}>
                            <Breadcrumb.Item href="http://localhost:8001/brands"><Icon type="bold" />品牌管理</Breadcrumb.Item>
                            <Breadcrumb.Item>新建品牌</Breadcrumb.Item>
                        </Breadcrumb>
                        <Form layout={formItemLayout}>
                            <Form.Item label="Logo" >
                                <Card bordered={false}>
                                    <div style={{ display: this.state.display }} className={styles.logo}>
                                        <Icon type="close" className={styles.ico} onClick={() => {
                                            this.setState({
                                                logo: "",
                                                display: "none",
                                                display_none: "block"
                                            })
                                        }} />
                                        <div>
                                            <img src={this.state.logo} alt="" width="317px" />
                                        </div>
                                    </div>
                                </Card>
                                <div className="dropbox">
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
                                    onChange={(e) => {
                                        this.setState({
                                            company: e.target.value
                                        })
                                    }}
                                />

                            </Form.Item>
                            <Form.Item label="官网" >
                                <Input
                                    onChange={(e) => {
                                        this.setState({
                                            website: e.target.value
                                        })
                                    }}
                                />
                            </Form.Item>
                            <Form.Item label="实时收款账户" >
                                <Input
                                    onChange={(e) => {
                                        this.setState({
                                            account: e.target.value
                                        })
                                    }}
                                />
                            </Form.Item>
                            <Form.Item label="收款银行" >
                                <Input
                                    onChange={(e) => {
                                        this.setState({
                                            bank_t: e.target.value
                                        })
                                    }}
                                />
                            </Form.Item>
                            <Form.Item label="收款银行账户" >
                                <Input
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
// brands_form_new = Form.create({})(brands_form_new)
export default brands_form_new;
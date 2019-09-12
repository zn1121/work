import React from 'react';
import { Table, Input, Card, Button, Icon, Pagination } from 'antd';
import axios from 'axios'
import { Route, Link, NavLink, withRouter } from 'react-router-dom'
import styles from './brands.css';
import { isEmptyStatement } from '@babel/types';

const { Search } = Input;


class Brands extends React.Component {
    constructor(props) { //构造函数
        super(props);
        this.state = {
            columns: [//表头
                { title: 'ID', dataIndex: 'id', key: 'id', align: 'left' ,width:242},
                {
                    title: 'LOGO', dataIndex: 'logo.url', key: 'logo',width:72,
                    render: (text) => {
                        return <img src={text} alt="" width={36}/>;
                    }
                },
                { title: '名称', dataIndex: 't', key: 't' ,width:225},
                {
                    title: '所属公司', dataIndex: 'company', key: 'company',width:248,align: 'left',
                    render: (text, obj) => {
                        if (obj.website == "") return <span>{text}</span>;
                        else return <a href={obj.website}>{text}</a>;;
                    }
                },
                { title: '门店数量', width:110,dataIndex: 'storeCount', key: 'storeCount', sorter: (a, b) => a.storeCount - b.storeCount, },
                {
                    title: '操作',
                    dataIndex: '',
                    align: 'center',
                    key: 'edit',
                    width:70,
                    render: (text, record, index) => {
                        // console.log("这个是record",record.id)
                        return <a onClick={this.editbtn.bind(this, record)} className={styles.editbtn}>编辑</a>
                    }
                },
            ],
            stores_data: "",//页面显示数据
        }
    }
    getData() { //请求数据函数
        let api = "/api/brands_list";
        axios.get(api)
            .then((response) => {
                this.setState({
                    stores_data: response.data
                })
            }).catch(function (error) {
                console.log(error);
            });
    }
    search_brands(e) {//搜索框的函数
        let api = "/api/brands_search";
        axios.get(api, {
            params: {
                data: e
            }
        })
            .then((response) => {
                this.setState({
                    stores_data: response.data
                })
            }).catch(function (error) {
                console.log(error);
            });
    }
    new_brand = () => {//新建品牌的函数
        this.props.history.push('/brands/brands_form_new')
    }
    componentWillMount() {//生命周期函数，页面加载好执行
        this.getData();
    }
    editbtn = (e) => {
        // console.log("这是e", e)
        this.props.history.push('/brands/brands_form_id', {
            id: e.id
        })
    }
    render() {
        return (
            <div>
                <Card bordered={false} >
                    <Search
                        placeholder="品牌ID/名称"
                        onChange={(e) => {
                            this.setState({
                                search_val: e.target.value
                            })
                        }}
                        onSearch={e => this.search_brands(e)}
                        style={{ width: 200, marginBottom: 10, float: "right" }}
                    />
                    <Button
                        type="dashed"
                        style={{ width: '100%' }}
                        icon="plus"
                        onClick={this.new_brand}
                    >
                        新建品牌
                    </Button>
                </Card>
                <Card bordered={false} >
                    <Table
                        columns={this.state.columns}
                        dataSource={this.state.stores_data}
                        pagination={{
                            total:this.state.stores_data.length,
                            showTotal:(total, range) => `显示第${range[0]}至${range[1]}项结果，共${total}项`,
                            pageSize:10,
                            defaultCurrent:1,
                            size:"small",
                        }}
                        style={{fontSize: '12px'}}
                        rowClassName={styles.t}
                    />
                </Card>
            </div >
        );
    }
}

export default Brands;

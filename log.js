import { logged } from '../../auth';

export default (router) => {
    var fs = require('fs');
    router
        .get('/log/log_download', logged, async (ctx) => {
            var timeString = ctx.query.time
            var id = ctx.query.id;//查询货柜id
            let file_name = 'http://140.143.202.93:7000/api/log/downloadlog?time=' + timeString ;
            // '/Users/yunji/Documents/log/2019-09-15.log'
            fs.readFile('/Users/yunji/Documents/log/2019-09-15.log', function (err, data) {
                if (err) throw err;
                console.log(data)
                var array = data.toString().split("\n");
                var array_data = [];
                for (let i in array) {
                    if (array[i].indexOf(id) != -1) {
                        array_data.push("\n"+array[i])
                    }
                }
                console.log(array_data)
                fs.writeFile('/Users/yunji/Documents/log/'+timeString+'.log',array_data,function(){
                    console.log("文件写入成功")
                })
            });
        });
};



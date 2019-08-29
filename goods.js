/**
 * @Author: Justin Hao <justinhao>
 * @Date:   2017-12-13
 * @Email:  justin@haoyufeng.com
 * @Last modified by:   justinhao
 * @Last modified time: 2018-06-04
 */

import Big from 'big.js';
import _ from 'lodash';
import each from 'lodash/each';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isInteger from 'lodash/isInteger';
import isObjectLike from 'lodash/isObjectLike';
import map from 'lodash/map';
import request from 'request-promise';
import set from 'lodash/set';
import trim from 'lodash/trim';
import unset from 'lodash/unset';

import { ObjectId, mongoose } from '../../libs/mongo';
import { domain, isMongoId, isNotMongoId, moment, sendApiError, sendApiResult, sendApiWrongParamsError } from '../../libs/utils';
import Container from '../../libs/models/Container';
import Category from '../../libs/models/Category';
import Good from '../../libs/models/Good';
import GoodExt from '../../libs/models/GoodExt';
import Image from '../../libs/models/Image';
import StockHistory from '../../libs/models/StockHistory';
import Track from '../../libs/models/Track';
import Store from '../../libs/models/Store';

import xlsx from 'node-xlsx';
import XLSX from 'xlsx';

/* 商品 */
export default (router) => {
  router
    // 商品分页
    .get('/stores/:sid/goods', async (ctx, next) => {
      const query = JSON.parse(ctx.query.data);

      const offset = parseInt(query.start);
      const limit = parseInt(query.length);
      const draw = query.draw;
      const sorts = query.sorts;
      const filters = query.filters;

      const sort = {};
      const params = { store: ctx.params.sid, valid: true, ext: { $exists: true } };

      // 排序参数
      if (sorts && sorts.length > 0) {
        each(sorts, (item, i) => {
          set(sort, item.column, item.order === 'desc' ? -1 : 1);
        });
      }

      // 搜索参数
      let deliveryType;
      if (filters) {
        each(filters, (v, k) => {
          if (isEmpty(v)) return;
          switch (k) {
            case 'key': {
              const or = [];
              if (isMongoId(v)) or.push({ _id: v });
              else {
                try {
                  const re = new RegExp(v, 'i');
                  or.push({ t: { $regex: re } }, { syns: { $regex: re } }, { assocs: { $regex: re } });
                } catch (e) {
                  // 无需处理
                }
              }
              params.$or = or;
              break;
            }
            case 'start':
            case 'end': {
              const start = moment(filters.start, 'YYYY-MM-DD');
              const end = moment(filters.end, 'YYYY-MM-DD');
              set(params, 'at', { $gte: start, $lt: end });
              unset(filters, 'start');
              unset(filters, 'end');
              break;
            }
            case 'status':
              set(params, 'status', (v === 'on') ? 0 : 1);
              break;
            case 'deliveryType':
              deliveryType = parseInt(v, 10) || 0;
              break;
            default:
              set(params, k, v);
          }
        });
      }
      if (deliveryType !== undefined) {
        const appendpipe = (pipes, model, localField) => {
          const $lookup = {
            from: model,
            localField,
            foreignField: '_id',
            as: `${localField}`
          };
          pipes.push({ $lookup });
          const $unwind = {
            path: `$${localField}`,
            preserveNullAndEmptyArrays: false,
          };
          pipes.push({ $unwind });
        };
        params.store = ObjectId(params.store);
        const pipes = [{ $match: params }];
        appendpipe(pipes, 'stores', 'store');
        appendpipe(pipes, 'brands', 'brand');
        appendpipe(pipes, 'goodexts', 'ext');
        pipes.push({ $match: { 'ext.deliveryType': deliveryType } });
        const ps = [];
        {
          const cp = _.cloneDeep(pipes);
          cp.push({ $count: 'count' });
          ps.push(Good.aggregate(cp));
        }
        {
          const cp = _.cloneDeep(pipes);
          cp.push({ $skip: offset });
          cp.push({ $limit: limit });
          ps.push(Good.aggregate(cp));
        }
        const values = await Promise.all(ps);
        const total = (values.length && values[0].length) ? values[0][0].count : 0;

        const rows = values[1];
        for (const row of rows) {
          if (!row.ext) {
            row.ext = { tracks: [], stock: 0 };
          }
        }
        const result = { total, rows, draw };
        ctx.body = result;
      } else {
        const tasks = [
          Good.find(params)
            .populate('brand store ext')
            .skip(offset)
            .limit(limit)
            .sort(sort),
          Good.countDocuments(params)
        ];
        const values = await Promise.all(tasks).then();
        const rows = values[0];
        for (const row of rows) {
          if (!row.ext) {
            row.ext = { tracks: [], stock: 0 };
          }
        }
        const result = { total: values[1], rows, draw };
        ctx.body = result;
      }
    })
    .get('/stores/:sid/deletegood/:gid', async (ctx, next) => {
      const { sid, gid } = ctx.params;
      // 释放货道
      await GoodExt.findOneAndUpdate({ good: gid }, { $set: { tracks: [] } });
      await Track.updateMany({ good: gid }, { $set: { good: null } });
      const goodRes = await Good.findOneAndUpdate({ _id: gid }, { $set: { valid: false, status: 1 } });
      sendApiResult(ctx, goodRes);
    })
    // 指定分类的商品
    .get('/stores/:sid/:category/goods', async (ctx, next) => {
      const { sid, category } = ctx.params;
      const sort = [];
      const query = { store: sid, valid: true };
      if (category && category !== 'all' && category !== 'isRecommend') {
        const cids = (await Category.find({ parent: category }).distinct('_id')) || [];
        cids.push(category);

        query.category = { $in: map(cids, c => ObjectId(c)) };
        sort.push([`sorts.${category}`, -1]);
      } else if (category === 'isRecommend') {
        // 兼容推荐商品
        const goods = await Good.find({ store: sid, valid: true });
        const exts = await GoodExt.find({ good: { $in: goods.map(item => item._id) }, isRecommend: true });
        const extIds = exts.map(item => item._id);
        query.ext = { $in: extIds };
        sort.push(['sortRecommend', -1]);
      } else {
        sort.push(['sort', -1]);
      }
      query.valid = true;
      const goods = await Good.find(query).select('_id t status ext');
      const gids = map(goods, o => o.id);
      const exts = await GoodExt.find({ good: { $in: gids } })
        .select('sort sorts cover')
        .sort(sort);
      const items = map(exts, o => o.toObject());
      let num = 0;
      each(items, (it) => {
        num += 1;
        each(goods, (g) => {
          if (it.id.toString() === g.ext.toString()) it.good = g.toObject();
        });
      });

      sendApiResult(ctx, items);
    })
    // 商品排序保存
    .post('/stores/:sid/:category/goods/sort', async (ctx, next) => {
      const { sid, category } = ctx.params;
      const ids = ctx.request.body.ids;

      if (!ids || ids.length < 1) {
        sendApiResult(ctx);
        return;
      }

      const bulk = GoodExt.collection.initializeOrderedBulkOp();//插入大量数据

      if (category === 'all') {
        // 全部分类
        const gids = await Good.find({ store: sid });
        await GoodExt.update({ _id: { $in: gids } }, { $set: { sort: 0 } }, { multi: true });

        let total = ids.length + 1;

        each(ids, (id) => {
          bulk.find({ _id: ObjectId(id) }).update({ $set: { sort: total } });
          total -= 1;
        });
      } else if (category === 'isRecommend') {
        const goodItems = await Good.find({ store: sid, valid: true }).populate('ext');
        const goodItemsRecommend = goodItems.filter((item) => {
          if (item.ext && item.ext.id && item.ext.isRecommend) {
            return true;
          } else {
            return false;
          }
        });
        const gids = goodItemsRecommend.map(item => item.ext.id);
        await GoodExt.update({ _id: { $in: gids } }, { $set: { sortRecommend: 0 } }, { multi: true });

        let total = ids.length + 1;
        each(ids, (id) => {
          bulk.find({ _id: ObjectId(id) }).update({ $set: { sortRecommend: total } });
          total -= 1;
        });
      } else {
        // 指定分类
        const gids = await Good.find({ store: sid, category });
        const key = `sorts.${category}`;
        await GoodExt.update(
          { _id: { $in: gids } },
          {
            $set: {
              [key]: 0
            }
          },
          { multi: true }
        );

        let total = ids.length + 1;

        each(ids, (id) => {
          bulk.find({ _id: ObjectId(id) }).update({
            $set: {
              [key]: total
            }
          });
          total -= 1;
        });
      }

      await bulk.execute();
      sendApiResult(ctx);
    })
    // 商品保存
    .post('/stores/:sid/goods', async (ctx, next) => {
      const body = ctx.request.body;

      let item, ext;
      if (body.id) {
        item = await Good.findById(body.id);
        ext = await GoodExt.findOne({ good: body.id });
      }

      if (isEmpty(ext)) {
        ext = new GoodExt({ _id: ObjectId() });
      }

      if (isEmpty(item)) {
        item = new Good({ ext: ext._id });
      }
      if (ext._id && (!item.ext)) item.ext = ext._id;

      item.t = body.t;
      item.type = body.type; // 运费兼容
      item.makeTime = body.makeTime; // 商品制作运费 单位 分钟
      item.brand = body.brand;
      if (body.category && body.category.length > 0) item.category = body.category;
      item.store = ctx.params.sid;
      item.status = parseInt(body.status);
      item.cost = new Big(body.cost).times(100).toFixed(0);
      item.p = body.isComplimentary && parseInt(body.isComplimentary) === 1 ? 0 : new Big(body.p).times(100).toFixed(0);
      item.op = new Big(body.op).times(100).toFixed(0);
      item.isJoinBoon = body.isJoinBoon && parseInt(body.isJoinBoon) === 1;
      item.displayName = body.displayName;

      if (body.goods) {
        const goodList = JSON.parse(body.goods);
        if (goodList.length > 0) item.goods = goodList;
      }

      // 分成比例
      if (body.allocationType) {
        // '0' '1' '2'
        item.allocationType = parseInt(body.allocationType);
        item.allocation = (parseInt(body.allocation) / 100).toFixed(2);
      }

      if (body.tods && body.tods.length > 0) {
        const tods = [];
        each(body.tods, (t) => {
          if (t.start && t.end && t.start.length > 2 && t.end.length > 2) tods.push(t);
        });
        item.tods = tods;
      }

      if (body.isComplimentary && parseInt(body.isComplimentary) === 1) item.type = 'complimentary';

      item.lod = body.lod ? parseInt(body.lod) : undefined;
      // if(body.start && body.start.length > 0) item.start = moment(body.start, 'YYYY-MM-DD').startOf('day').toDate();
      // if(body.end && body.end.length > 0) item.end = moment(body.end, 'YYYY-MM-DD').endOf('day').toDate();
      item.start =
        body.start && body.start.length > 0
          ? moment(body.start, 'YYYY-MM-DD')
            .startOf('day')
            .toDate()
          : body.start;
      item.end =
        body.end && body.end.length > 0
          ? moment(body.end, 'YYYY-MM-DD')
            .endOf('day')
            .toDate()
          : body.end;

      // 门店
      if (body.stores && body.stores.length > 0) {
        if (isArray(body.stores)) item.stores = body.stores;
        else item.stores = [body.stores];
      } else item.stores = [];

      ext.d = body.d;
      ext.isRecommend = body.isRecommend && parseInt(body.isRecommend) === 1;
      ext.isJoinBoon = body.isJoinBoon && parseInt(body.isJoinBoon) === 1;

      if (body.ext && body.ext.deliveryType) ext.deliveryType = parseInt(body.ext.deliveryType);
      ext.paymentSuccessPage = body.paymentSuccessPage;

      // 头图
      if (body.cover) ext.cover = new Image({ f: body.cover });

      // 图片
      if (body.imgs) {
        const images = [];
        const imgs = body.imgs.split(',');
        each(imgs, (f, i) => {
          if (f.length > 0) images.push(new Image({ f, order: i }));
        });
        ext.imgs = images;
      } else ext.imgs = undefined;

      // 附加信息
      const additional = setupValues(body.additional);
      ext.additional = additional;
      // 检查是否需要更新
      if (item.isModified()) {
        await item.save();
      }

      // 商品
      ext.good = item._id;

      // 货道
      if (body.tracks) {
        const list = JSON.parse(body.tracks);
        const tracks = [];

        await Track.update({ good: item.id }, { $set: { good: undefined } }, { multi: true });
        await Promise.each(
          list,
          l => new Promise(async (resolve) => {
            const arr = l.split('|');
            const container = await Container.findOne({ pid: arr[0] }).select('_id id');
            if (arr && arr.length === 2 && container) {
              const track = await Track.findOneAndUpdate({ container: container.id, no: arr[1] }, { $set: { good: item.id } });
              if (track) tracks.push(track.id);
            }
            resolve();
          })
        ).then();
        ext.tracks = tracks;
      }

      await ext.save();

      // 处理库存增减
      if (body.revision && body.revision.length > 0) {
        const api = `http://${domain}/api/goods/${item.id}/stock`;
        const revision = parseInt(body.revision);
        const result = await request({ url: api, method: 'POST', form: { amount: revision, user: ctx.state.user.id } });
      }

      sendApiResult(ctx);
    })
    // 商品货道
    .get('/goods/:id/tracks', async (ctx, next) => {
      const items = await Track.find({ good: ctx.params.id }).populate('container');
      sendApiResult(ctx, items);
    })
    // 商品版本历史
    .get('/goods/:id/versions', async (ctx, next) => {
      const items = await Good.VersionedModel.find({ refId: ctx.params.id }).sort('-_id');
      sendApiResult(ctx, items);
    })
    // 上下架商品
    .post('/goods/:id/display', async (ctx, next) => {
      const cid = ctx.params.id;
      const status = parseInt(ctx.request.body.status);
      const res = await Good.findOneAndUpdate({ _id: cid }, { $set: { status } });
      sendApiResult(ctx, res);
    })
    // 库存增减
    .post('/goods/:id/stock', async (ctx, next) => {
      const cid = ctx.params.id;
      const amount = parseInt(ctx.request.body.amount);
      const at = new Date();
      if (!isInteger(amount) || amount === 0) sendApiWrongParamsError(ctx);
      else {
        const good = await Good.findById(cid);
        const ext = await GoodExt.findOne({ good: cid });

        ext.total += amount;
        ext.stock += amount;

        await ext.save();

        const user = ctx.state.user;
        const history = new StockHistory({ user: user ? user.id : ctx.request.body.user, good, amount });
        await history.save();
      }

      sendApiResult(ctx);
    })
    // 商品库存修改历史
    .get('/goods/:id/stockhistory', async (ctx, next) => {
      const items = await StockHistory.find({ good: ctx.params.id }).populate('user');
      sendApiResult(ctx, items);
    })
    // 商品搜索
    .get('/goods/search', (ctx, next) => {
      const q = encodeURIComponent(trim(ctx.query.q));
      ctx.redirect(`/api/goods/search/${q}`);
    })
    .get('/goods/search/:key', async (ctx, next) => {
      const key = new RegExp(trim(ctx.params.key), 'i');
      const or = [{ t: key }];
      const query = { $or: or };

      const items = await Good.find(query)
        .populate('brand stores ext')
        .limit(20);
      sendApiResult(ctx, items);
    })
    // 商品最新 Version
    .get('/goods/:id/last/version', async (ctx, next) => {
      const id = ctx.params.id;
      const item = isMongoId(id) ? await Good.VersionedModel.findOne({ refId: ctx.params.id }).sort('-_id') : null;
      sendApiResult(ctx, item);
    })
    //门店商品导出
    .get('/stores/goods/export', async (ctx, next) => {
      const query = JSON.parse(ctx.query.data);//获取店铺的名称
      console.log("这个是要导出酒店的名称", query);
      const gids = await Good.find({ store: query })
        .populate('store')
        .populate('brand')
        .populate('category')
        .populate('ext');
      console.log(gids[0]);
      const lineNameList = [
        '商品ID',
        '商品名称',
        '显示名称',
        '所属分类',
        '运营方式',
        '分成比例',
        '配送方式',
        '门店名称',//原所属门店
        '售价',
        '原价',
        '成本',
        '库存',
        '状态（上架/下架）',
        '是否参与活动',
        '创建时间',
        '更新时间'
      ];
      let datas = [];//数组的每一项都要是
      let list = [];//每次循环保存的数据，最后要push到数组datas里面
      datas.push(lineNameList);
      for (var i = 0; i < gids.length; i++) {
        list[0] = gids[i].id; //商品ID
        list[1] = gids[i].t;//商品名称
        if(!isEmpty(gids[i].displayName)){
          list[2] = gids[i].displayName;//显示名称
        }else{
          list[2] = "暂无其他显示名称";//显示名称
        }
        if(gids[i].category == undefined){
          list[3] = "暂无分类";//所属分类
        }else{
          list[3] = gids[i].category.t;//所属分类
        }
        //运营方式
        if(gids[i].allocationType == 0){
          list[4] = "自营"
        }else if(gids[i].allocationType == 1){
          list[4] = "平台"
        }else{
          list[4] = "其他"
        }
        list[5] = gids[i].allocation;//分成比例
        //配送方式(需要去访问goodsExt)
        if(gids[i].ext.deliveryType == 0){
          list[6] = "人工派送";
        }else if(gids[i].ext.deliveryType == 1){
          list[6] = "自动派送";
        }else if(gids[i].ext.deliveryType == 2){
          list[6] = "货柜派送";
        }else{
          list[6] = "无需送货";
        }
        list[7] = gids[i].brand.t;//门店名称
        list[8] = parseFloat(gids[i].p / 100).toFixed(2);//售价 
        list[9] = parseFloat(gids[i].op / 100).toFixed(2);//原价                        
        list[10] = parseFloat(gids[i].cost / 100).toFixed(2);//成本
        //库存 (需要去访问goodsExt)
        list[11] = gids[i].ext.total;
        
        if(gids[i].status == 0){//状态 0是下架，1是上架，2是关闭
          list[12] = "上架";
        }else if(gids[i].status == 1){
          list[12] = "下架";
        }else{
          list[12] = "关闭"
        }
        if (gids[i].isJoinBoon == "TRUE") { list[13] = "是" }//是否参加活动
        else { list[13] = "否" }
        //创建时间
        list[14] = gids[i].ext.at;
        //更新时间
        list[15] = gids[i].ext.uat;
        datas[i + 1] = list;
        list = [];
      }

      // datas.push(gids)
      const buffer = xlsx.build([{ name: '门店商品', data: datas }]);
      ctx.set('Content-Type', 'application/vnd.openxmlformats');
      let filename = 'all';//不能写中文，会报错
      // if(!isEmpty(start) && !isEmpty(end)) filename = `${start}--${end}`;
      ctx.set('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      ctx.body = buffer;
    })
};

function setupValues(object) {
  each(object, (v, k) => {
    if (v === 'on') {
      set(object, k, true);
      set(object, 'visible', true);
    } else if (isObjectLike(v)) {
      set(object, k, setupValues(v));
    }
  });

  return object;
}

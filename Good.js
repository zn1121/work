/**
 * @Author: Justin Hao <justinhao>
 * @Date:   2018-02-13
 * @Email:  justin@haoyufeng.com
 * @Last modified by:   justinhao
 * @Last modified time: 2018-05-24
 */

import { Enum } from 'enumify';
import omit from 'lodash/omit';

import { ImageSchema } from './Image';
import { mongoose, schemaOptions, version } from '../mongo';

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

// Model Good 商品
const GoodSchema = new Schema(
  {
    // 所属商户
    brand: { type: ObjectId, required: true, ref: 'Brand' },
    // 所属门店
    store: { type: ObjectId, required: true, ref: 'Store' },
    // 分类
    category: { type: ObjectId, ref: 'Category' },
    cloneObj: { type: ObjectId, required: false, ref: 'Good' },
    // 套餐包含的商品
    goods: [
      {
        goodId: { type: ObjectId, ref: 'Good' },
        amount: { type: Number }
      }
    ],
    // 标题
    t: { type: String, required: true, trim: true },
    // 显示名称
    displayName: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: 'goods' }, // goods-普通商品 'send'-运费 complimentary-赠品
    // 成本
    cost: { type: Number, required: true, default: 0 },
    // 原价
    op: { type: Number, required: true, default: 0 },
    // 售价
    p: { type: Number, required: true, default: 0 },
    // 商品是否有效
    valid: { type: Boolean, required: true, default: true },
    // 是否参与活动  由goodext 迁移到
    isJoinBoon: { type: Boolean, default: true, required: true },
    // 制作时间 单位 ：分钟
    makeTime: { type: Number, default: 0 },
    start: Date,
    end: Date,
    // 每日可销售时间 time Of Day
    tod: {
      start: { type: String },
      end: { type: String }
    },
    tods: [
      {
        start: { type: String },
        end: { type: String }
      }
    ],
    // 每日限购，不限购为空, limit of day
    lod: { type: Number },
    // 排序
    sort: { type: Number, required: true, default: 0 },
    // 状态
    status: { type: Number, required: true, default: 0 },
    // 分成类型
    allocationType: { type: Number, required: true, default: 100 },
    // 分成比例
    allocation: { type: Number, required: true, default: 0.0 },
    // 扩展信息
    ext: { type: ObjectId, required: true, ref: 'GoodExt' },
    at: { type: Date, default: Date.now }
  },
  omit(schemaOptions, ['timestamps'])
);

GoodSchema.index({ store: 1, category: 1, status: 1 });
GoodSchema.index({ brand: 1 });

GoodSchema.plugin(version, { strategy: 'collection', collection: 'goodversions', mongoose });

const Good = mongoose.model('Good', GoodSchema);

class Status extends Enum {}
Status.initEnum({
  NORMAL: { label: '上架' },
  PAUSE: { label: '下架' },
  CLOSE: { label: '关闭' }
});

Good.STATUS = Status;

class DeliveryTypes extends Enum {}
DeliveryTypes.initEnum({
  PASSWORD: { label: '人工派送' },
  NO_PASSWORD: { label: '自动派送' },
  CONTAINER: { label: '货柜派送' },
  NO_NEED: { label: '无需送货' }
});

Good.DELIVERY_TYPES = DeliveryTypes;

class AllocationTypes extends Enum {}
AllocationTypes.initEnum({
  SELF: { label: '自营', key: 'self' },
  PLATFORM: { label: '平台', key: 'platform' },
  OTHER: { label: '其他', key: 'other' }
});

Good.ALLOCATION_TYPES = AllocationTypes;

Good.DEEP_SELECT_FIELDS = 'brand t op p status';

export default Good;

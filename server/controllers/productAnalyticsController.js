import mongoose from 'mongoose';
import RetailSale from '../models/RetailSale.js';
import Product from '../models/Product.js';

function toObjectId(value) {
  if (!value || value === 'All' || value === 'all') return null;
  if (!mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function buildDateMatch(startDate, endDate) {
  if (!startDate && !endDate) return {};
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    createdAt.$lte = end;
  }
  return { createdAt };
}

/**
 * GET /api/v1/analytics/product-performance
 *
 * Query:
 *  - level: country | state | city (geo filter grain for place selectors)
 *  - country, state, city: ObjectId filters
 *  - product: ObjectId (optional single product focus)
 *  - startDate, endDate
 *  - sort_by: pairs | revenue | sales (default pairs)
 *  - limit: number
 *
 * Returns:
 *  - summary: totals
 *  - products: per-product performance in the selected place
 *  - places: place breakdown (cities within a state, states within a country, etc.)
 *  - top_products: ranked list
 */
export const getProductPerformance = async (req, res, next) => {
  try {
    const countryId = toObjectId(req.query.country);
    const stateId = toObjectId(req.query.state);
    const cityId = toObjectId(req.query.city);
    const productId = toObjectId(req.query.product);
    const sortBy = String(req.query.sort_by || 'pairs').toLowerCase();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const match = {
      ...buildDateMatch(req.query.startDate, req.query.endDate)
    };
    if (countryId) match.country = countryId;
    if (stateId) match.state = stateId;
    if (cityId) match.city = cityId;

    const sales = await RetailSale.find(match).lean();

    // Amounts are stored in paise when using lean() (getters don't run)
    const fromPaise = (v) => (Number(v) || 0) / 100;

    let totalPairs = 0;
    let totalRevenue = 0;
    let totalLineHits = 0;
    let totalDiscount = 0;

    const productMap = new Map();
    const placeMap = new Map();

    // Determine which place grain to break down
    let placeGrain = 'country';
    if (cityId) placeGrain = 'city';
    else if (stateId) placeGrain = 'city';
    else if (countryId) placeGrain = 'state';
    else placeGrain = 'country';

    for (const sale of sales) {
      totalRevenue += fromPaise(sale.grand_total);
      totalDiscount += fromPaise(sale.discount_amount);
      totalPairs += Number(sale.pairs_sold) || 0;

      let placeKey;
      let placeName;
      if (placeGrain === 'city') {
        placeKey = String(sale.city || 'unknown');
        placeName = sale.city_name || 'Unknown City';
      } else if (placeGrain === 'state') {
        placeKey = String(sale.state || 'unknown');
        placeName = sale.state_name || 'Unknown State';
      } else {
        placeKey = String(sale.country || 'unknown');
        placeName = sale.country_name || 'Unknown Country';
      }

      if (!placeMap.has(placeKey)) {
        placeMap.set(placeKey, {
          place_id: sale[placeGrain] || null,
          place_name: placeName,
          place_type: placeGrain,
          pairs_sold: 0,
          sale_count: 0,
          revenue: 0,
          products: new Map()
        });
      }
      const place = placeMap.get(placeKey);
      place.sale_count += 1;
      place.revenue += fromPaise(sale.grand_total);
      place.pairs_sold += Number(sale.pairs_sold) || 0;

      for (const item of sale.items || []) {
        const pid = String(item.product || '');
        if (productId && pid !== String(productId)) continue;

        const pairs = Number(item.quantity) || 0;
        const revenue = fromPaise(item.line_total);
        totalLineHits += 1;

        if (!productMap.has(pid)) {
          productMap.set(pid, {
            product_id: item.product,
            product_name: item.product_name || 'Product',
            pairs_sold: 0,
            sale_count: 0,
            revenue: 0,
            discount_amount: 0,
            places: new Map()
          });
        }
        const prod = productMap.get(pid);
        prod.pairs_sold += pairs;
        prod.revenue += revenue;
        prod.discount_amount += fromPaise(item.line_discount_amount);
        prod.sale_count += 1;

        // place × product
        if (!place.products.has(pid)) {
          place.products.set(pid, {
            product_id: item.product,
            product_name: item.product_name || 'Product',
            pairs_sold: 0,
            sale_count: 0,
            revenue: 0
          });
        }
        const pp = place.products.get(pid);
        pp.pairs_sold += pairs;
        pp.revenue += revenue;
        pp.sale_count += 1;

        if (!prod.places.has(placeKey)) {
          prod.places.set(placeKey, {
            place_id: sale[placeGrain] || null,
            place_name: placeName,
            place_type: placeGrain,
            pairs_sold: 0,
            sale_count: 0,
            revenue: 0
          });
        }
        const pr = prod.places.get(placeKey);
        pr.pairs_sold += pairs;
        pr.revenue += revenue;
        pr.sale_count += 1;
      }
    }

    // If product filter was set, recompute summary from productMap only
    if (productId) {
      totalPairs = 0;
      totalRevenue = 0;
      totalLineHits = 0;
      totalDiscount = 0;
      for (const p of productMap.values()) {
        totalPairs += p.pairs_sold;
        totalRevenue += p.revenue;
        totalLineHits += p.sale_count;
        totalDiscount += p.discount_amount;
      }
    }

    const sortFn = (a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'sales') return b.sale_count - a.sale_count;
      return b.pairs_sold - a.pairs_sold;
    };

    // Enrich product names from Product collection if missing
    const missingNames = [...productMap.values()].filter((p) => !p.product_name || p.product_name === 'Product');
    if (missingNames.length > 0) {
      const ids = missingNames.map((p) => p.product_id).filter(Boolean);
      const docs = await Product.find({ _id: { $in: ids } }).select('name').lean();
      const nameMap = new Map(docs.map((d) => [String(d._id), d.name]));
      for (const p of productMap.values()) {
        if ((!p.product_name || p.product_name === 'Product') && nameMap.has(String(p.product_id))) {
          p.product_name = nameMap.get(String(p.product_id));
        }
      }
    }

    const products = [...productMap.values()]
      .map((p) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        pairs_sold: p.pairs_sold,
        sale_count: p.sale_count,
        revenue: Math.round(p.revenue * 100) / 100,
        discount_amount: Math.round(p.discount_amount * 100) / 100,
        places: [...p.places.values()]
          .map((pl) => ({
            ...pl,
            revenue: Math.round(pl.revenue * 100) / 100
          }))
          .sort(sortFn)
      }))
      .sort(sortFn)
      .slice(0, limit);

    const places = [...placeMap.values()]
      .map((pl) => ({
        place_id: pl.place_id,
        place_name: pl.place_name,
        place_type: pl.place_type,
        pairs_sold: pl.pairs_sold,
        sale_count: pl.sale_count,
        revenue: Math.round(pl.revenue * 100) / 100,
        products: [...pl.products.values()]
          .map((p) => ({
            ...p,
            revenue: Math.round(p.revenue * 100) / 100
          }))
          .sort(sortFn)
          .slice(0, limit)
      }))
      .sort(sortFn);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_pairs_sold: totalPairs,
          total_sale_entries: productId
            ? new Set(
                sales
                  .filter((s) => (s.items || []).some((i) => String(i.product) === String(productId)))
                  .map((s) => String(s._id))
              ).size
            : sales.length,
          total_line_hits: totalLineHits,
          total_revenue: Math.round(totalRevenue * 100) / 100,
          total_discount: Math.round(totalDiscount * 100) / 100,
          place_grain: placeGrain,
          filters: {
            country: countryId,
            state: stateId,
            city: cityId,
            product: productId,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null
          }
        },
        products,
        places,
        top_products: products.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

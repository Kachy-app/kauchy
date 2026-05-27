from .models import UserCategoryModel
from Products_app.models import Product
import random


def personalized_feed(user):
    products = Product.objects.select_related('vendor_id').all()
    user_categories = {uc.category: uc for uc in UserCategoryModel.objects.filter(user=user)}

    scored_products = []

    for product in products:
        user_view = user_categories.get(product.category)
        if user_view:
            category_boost = 1 + (user_view.view_count * 0.1)
        else:
            category_boost = 1

        if product.vendor_id.institute == user.institute:
            location_boost = 2.0
        else:
            location_boost = 1.0

        if product.view_count > 100:
            popularity_boost = 1.3  
        elif product.view_count > 50:
            popularity_boost = 1.15
        else:
            popularity_boost = 1.0

        total_boost = category_boost * location_boost * popularity_boost
        score = total_boost * random.random()
        scored_products.append((score, product))

    scored_products.sort(key=lambda x: x[0], reverse=True)
    # print(scored_products)
    recommended_products = [product for score, product in scored_products]

    return recommended_products
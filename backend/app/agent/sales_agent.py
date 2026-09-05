from app.services.catalog import search_products, get_product


class SalesAgent:

    def search(
        self,
        query: str | None = None,
        category: str | None = None,
        max_price: float | None = None
    ):
        products = search_products(
            query=query,
            category=category,
            max_price=max_price
        )

        return {
            "success": True,
            "query": query,
            "count": len(products),
            "products": products
        }

    def get_product(self, product_id: str):
        product = get_product(product_id)

        if not product:
            return {
                "success": False,
                "message": "Product not found."
            }

        return {
            "success": True,
            "product": product
        }

    def recommend(self, products):

        if not products:
            return {
                "success": False,
                "message": "I couldn't find a suitable product."
            }

        # Rank by rating first, then lower price
        ranked_products = sorted(
            products,
            key=lambda product: (
                -product["rating"],
                product["price"]
            )
        )

        best = ranked_products[0]

        return {
            "success": True,
            "product": best,
            "reason": (
                f"I recommend {best['name']} because it has "
                f"a {best['rating']} rating and costs "
                f"₹{best['price']:,.0f}."
            )
        }

    def recommend_for_query(
        self,
        query: str,
        category: str | None = None,
        max_price: float | None = None
    ):

        products = search_products(
            query=query,
            category=category,
            max_price=max_price
        )

        recommendation = self.recommend(products)

        return {
            "query": query,
            "matches": products,
            "recommendation": recommendation
        }


agent = SalesAgent()
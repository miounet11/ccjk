---
name: django-patterns
description: Django best practices, model design, view patterns, and ORM optimization
description_zh: Django 最佳实践、模型设计、视图模式和 ORM 优化
version: 1.0.0
category: backend
triggers: ['/django-patterns', '/django', '/django-orm', '/django-views']
use_when:
  - Building Django applications with best practices
  - Designing Django models and database schemas
  - Implementing Django views and URL patterns
  - Optimizing Django ORM queries and performance
use_when_zh:
  - 使用最佳实践构建 Django 应用程序
  - 设计 Django 模型和数据库架构
  - 实现 Django 视图和 URL 模式
  - 优化 Django ORM 查询和性能
auto_activate: true
priority: 8
agents: [django-expert, backend-architect]
tags: [django, orm, models, views, performance]
---

# Django Patterns | Django 模式

## Context | 上下文

Use this skill when developing Django applications that require scalable architecture, optimized database queries, and maintainable code structure. Essential for production-ready Django development.

在开发需要可扩展架构、优化数据库查询和可维护代码结构的 Django 应用程序时使用此技能。对于生产就绪的 Django 开发至关重要。

## Model Design Patterns | 模型设计模式

### 1. Model Best Practices | 模型最佳实践

```python
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.urls import reverse
from typing import Optional
import uuid

# ✅ Good: Well-designed models with proper relationships

class TimeStampedModel(models.Model):
    """Abstract base model with timestamp fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class User(AbstractUser):
    """Custom user model extending AbstractUser."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    date_of_birth = models.DateField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active', 'is_verified']),
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} ({self.email})"

    def get_full_name(self) -> str:
        """Return the full name of the user."""
        return f"{self.first_name} {self.last_name}".strip()

class Category(TimeStampedModel):
    """Product category model."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self) -> str:
        return self.name

    def get_absolute_url(self) -> str:
        return reverse('category-detail', kwargs={'slug': self.slug})

class Product(TimeStampedModel):
    """Product model with proper relationships and validation."""
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products'
    )
    tags = models.ManyToManyField('Tag', blank=True, related_name='products')
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['featured', 'is_active']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self) -> str:
        return self.name

    def get_absolute_url(self) -> str:
        return reverse('product-detail', kwargs={'slug': self.slug})

    @property
    def is_in_stock(self) -> bool:
        """Check if product is in stock."""
        return self.stock_quantity > 0

    def reduce_stock(self, quantity: int) -> None:
        """Reduce stock quantity."""
        if quantity > self.stock_quantity:
            raise ValueError("Insufficient stock")
        self.stock_quantity -= quantity
        self.save(update_fields=['stock_quantity'])

class Order(TimeStampedModel):
    """Order model with proper status management."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self) -> str:
        return f"Order {self.id} - {self.user.email}"

class OrderItem(models.Model):
    """Order item model for many-to-many relationship with additional fields."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ['order', 'product']

    def __str__(self) -> str:
        return f"{self.quantity}x {self.product.name}"

    @property
    def total_price(self) -> float:
        """Calculate total price for this item."""
        return float(self.quantity * self.unit_price)

# ❌ Bad: Poor model design
class BadProduct(models.Model):
    name = models.CharField(max_length=1000)  # Too long
    price = models.FloatField()  # Use DecimalField for money
    category_name = models.CharField(max_length=100)  # Should be ForeignKey
    # Missing indexes, validation, and proper relationships
```

### 2. Custom Managers and QuerySets | 自定义管理器和查询集

```python
from django.db import models
from django.db.models import Q, Count, Avg
from typing import Optional

# ✅ Good: Custom QuerySet and Manager

class ProductQuerySet(models.QuerySet):
    """Custom QuerySet for Product model."""

    def active(self):
        """Filter active products."""
        return self.filter(is_active=True)

    def in_stock(self):
        """Filter products that are in stock."""
        return self.filter(stock_quantity__gt=0)

    def by_category(self, category_slug: str):
        """Filter products by category slug."""
        return self.filter(category__slug=category_slug)

    def featured(self):
        """Filter featured products."""
        return self.filter(featured=True)

    def search(self, query: str):
        """Search products by name or description."""
        return self.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )

    def with_category(self):
        """Select related category to avoid N+1 queries."""
        return self.select_related('category')

    def with_tags(self):
        """Prefetch tags to avoid N+1 queries."""
        return self.prefetch_related('tags')

    def popular(self, limit: int = 10):
        """Get popular products based on order count."""
        return self.annotate(
            order_count=Count('orderitem')
        ).order_by('-order_count')[:limit]

class ProductManager(models.Manager):
    """Custom manager for Product model."""

    def get_queryset(self):
        """Return custom QuerySet."""
        return ProductQuerySet(self.model, using=self._db)

    def active(self):
        """Get active products."""
        return self.get_queryset().active()

    def available(self):
        """Get active products that are in stock."""
        return self.get_queryset().active().in_stock()

    def featured(self):
        """Get featured products."""
        return self.get_queryset().active().featured()

# Add to Product model
class Product(TimeStampedModel):
    # ... other fields ...

    objects = ProductManager()  # Custom manager

    # ... rest of the model ...

# Usage examples
# Get all active products with categories
products = Product.objects.active().with_category()

# Search for products
search_results = Product.objects.active().search("laptop")

# Get featured products by category
featured_laptops = Product.objects.featured().by_category("laptops")

# Get popular products
popular_products = Product.objects.popular(limit=5)
```

## View Patterns | 视图模式

### 1. Class-Based Views (CBVs) | 基于类的视图

```python
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Q, Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse_lazy
from django.contrib import messages
from typing import Any, Dict

# ✅ Good: Well-structured CBVs with mixins

class ProductListView(ListView):
    """List view for products with filtering and pagination."""
    model = Product
    template_name = 'products/list.html'
    context_object_name = 'products'
    paginate_by = 20

    def get_queryset(self):
        """Get filtered and optimized queryset."""
        queryset = Product.objects.active().with_category().with_tags()

        # Apply filters
        category_slug = self.request.GET.get('category')
        if category_slug:
            queryset = queryset.by_category(category_slug)

        search_query = self.request.GET.get('q')
        if search_query:
            queryset = queryset.search(search_query)

        # Apply ordering
        ordering = self.request.GET.get('ordering', '-created_at')
        if ordering in ['name', '-name', 'price', '-price', '-created_at']:
            queryset = queryset.order_by(ordering)

        return queryset

    def get_context_data(self, **kwargs) -> Dict[str, Any]:
        """Add additional context data."""
        context = super().get_context_data(**kwargs)
        context['categories'] = Category.objects.filter(is_active=True)
        context['current_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')
        context['current_ordering'] = self.request.GET.get('ordering', '-created_at')
        return context

class ProductDetailView(DetailView):
    """Detail view for a single product."""
    model = Product
    template_name = 'products/detail.html'
    context_object_name = 'product'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_queryset(self):
        """Optimize queryset with related objects."""
        return Product.objects.active().with_category().with_tags().select_related('category')

    def get_context_data(self, **kwargs) -> Dict[str, Any]:
        """Add related products to context."""
        context = super().get_context_data(**kwargs)
        product = self.object

        # Get related products from same category
        context['related_products'] = Product.objects.active().filter(
            category=product.category
        ).exclude(id=product.id)[:4]

        return context

class ProductCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    """Create view for products (admin only)."""
    model = Product
    template_name = 'products/create.html'
    fields = ['name', 'slug', 'description', 'price', 'stock_quantity', 'category', 'tags']
    success_url = reverse_lazy('product-list')

    def test_func(self) -> bool:
        """Check if user is staff."""
        return self.request.user.is_staff

    def form_valid(self, form):
        """Add success message."""
        messages.success(self.request, 'Product created successfully!')
        return super().form_valid(form)

class OrderListView(LoginRequiredMixin, ListView):
    """List view for user's orders."""
    model = Order
    template_name = 'orders/list.html'
    context_object_name = 'orders'
    paginate_by = 10

    def get_queryset(self):
        """Get orders for current user."""
        return Order.objects.filter(
            user=self.request.user
        ).prefetch_related(
            Prefetch(
                'items',
                queryset=OrderItem.objects.select_related('product')
            )
        ).order_by('-created_at')

# ✅ Good: API views with proper error handling
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

@method_decorator(csrf_exempt, name='dispatch')
class ProductAPIView(View):
    """API view for products."""

    def get(self, request, *args, **kwargs):
        """Get products as JSON."""
        try:
            products = Product.objects.active().with_category()

            # Apply filters
            category = request.GET.get('category')
            if category:
                products = products.by_category(category)

            data = [
                {
                    'id': str(product.id),
                    'name': product.name,
                    'slug': product.slug,
                    'price': str(product.price),
                    'category': product.category.name,
                    'in_stock': product.is_in_stock,
                }
                for product in products[:20]  # Limit results
            ]

            return JsonResponse({'products': data})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    def post(self, request, *args, **kwargs):
        """Create new product via API."""
        if not request.user.is_authenticated or not request.user.is_staff:
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        try:
            data = json.loads(request.body)

            # Validate required fields
            required_fields = ['name', 'slug', 'description', 'price', 'category_id']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'Missing field: {field}'}, status=400)

            # Create product
            product = Product.objects.create(
                name=data['name'],
                slug=data['slug'],
                description=data['description'],
                price=data['price'],
                category_id=data['category_id'],
                stock_quantity=data.get('stock_quantity', 0),
            )

            return JsonResponse({
                'id': str(product.id),
                'name': product.name,
                'slug': product.slug,
            }, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
```

### 2. Function-Based Views (FBVs) | 基于函数的视图

```python
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction
from django.http import HttpRequest, HttpResponse
from django.core.paginator import Paginator

# ✅ Good: Well-structured FBVs

def product_list(request: HttpRequest) -> HttpResponse:
    """List products with filtering and pagination."""
    # Get base queryset
    products = Product.objects.active().with_category()

    # Apply filters
    category_slug = request.GET.get('category')
    if category_slug:
        products = products.by_category(category_slug)

    search_query = request.GET.get('q')
    if search_query:
        products = products.search(search_query)

    # Pagination
    paginator = Paginator(products, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'categories': Category.objects.filter(is_active=True),
        'current_category': category_slug or '',
        'search_query': search_query or '',
    }

    return render(request, 'products/list.html', context)

@login_required
@transaction.atomic
def create_order(request: HttpRequest) -> HttpResponse:
    """Create a new order with items."""
    if request.method == 'POST':
        try:
            # Get cart items from session
            cart_items = request.session.get('cart', {})
            if not cart_items:
                messages.error(request, 'Your cart is empty.')
                return redirect('cart')

            # Calculate total
            total_amount = 0
            order_items = []

            for product_id, quantity in cart_items.items():
                product = get_object_or_404(Product, id=product_id, is_active=True)

                if product.stock_quantity < quantity:
                    messages.error(
                        request,
                        f'Insufficient stock for {product.name}. Available: {product.stock_quantity}'
                    )
                    return redirect('cart')

                item_total = product.price * quantity
                total_amount += item_total

                order_items.append({
                    'product': product,
                    'quantity': quantity,
                    'unit_price': product.price,
                })

            # Create order
            order = Order.objects.create(
                user=request.user,
                total_amount=total_amount,
                shipping_address=request.POST.get('shipping_address', ''),
                notes=request.POST.get('notes', ''),
            )

            # Create order items and update stock
            for item_data in order_items:
                OrderItem.objects.create(
                    order=order,
                    product=item_data['product'],
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                )

                # Reduce stock
                item_data['product'].reduce_stock(item_data['quantity'])

            # Clear cart
            request.session['cart'] = {}

            messages.success(request, f'Order {order.id} created successfully!')
            return redirect('order-detail', pk=order.id)

        except Exception as e:
            messages.error(request, f'Error creating order: {str(e)}')
            return redirect('cart')

    # GET request - show order form
    cart_items = request.session.get('cart', {})
    if not cart_items:
        messages.info(request, 'Your cart is empty.')
        return redirect('product-list')

    # Calculate cart total
    cart_products = []
    total = 0

    for product_id, quantity in cart_items.items():
        try:
            product = Product.objects.get(id=product_id, is_active=True)
            item_total = product.price * quantity
            total += item_total

            cart_products.append({
                'product': product,
                'quantity': quantity,
                'total': item_total,
            })
        except Product.DoesNotExist:
            continue

    context = {
        'cart_products': cart_products,
        'total': total,
    }

    return render(request, 'orders/create.html', context)

def add_to_cart(request: HttpRequest, product_id: int) -> HttpResponse:
    """Add product to cart."""
    product = get_object_or_404(Product, id=product_id, is_active=True)

    if not product.is_in_stock:
        messages.error(request, f'{product.name} is out of stock.')
        return redirect('product-detail', slug=product.slug)

    # Get or initialize cart
    cart = request.session.get('cart', {})

    # Add or update quantity
    if str(product_id) in cart:
        cart[str(product_id)] += 1
    else:
        cart[str(product_id)] = 1

    # Check stock limit
    if cart[str(product_id)] > product.stock_quantity:
        cart[str(product_id)] = product.stock_quantity
        messages.warning(
            request,
            f'Only {product.stock_quantity} items available for {product.name}.'
        )
    else:
        messages.success(request, f'{product.name} added to cart.')

    # Save cart to session
    request.session['cart'] = cart

    return redirect('product-detail', slug=product.slug)
```

## ORM Optimization | ORM 优化

### 1. Query Optimization | 查询优化

```python
from django.db.models import Prefetch, Count, Sum, Avg, F, Q
from django.db import connection

# ✅ Good: Optimized queries

def get_products_with_categories():
    """Get products with categories in a single query."""
    return Product.objects.select_related('category').filter(is_active=True)

def get_orders_with_items():
    """Get orders with items and products in optimized queries."""
    return Order.objects.prefetch_related(
        Prefetch(
            'items',
            queryset=OrderItem.objects.select_related('product__category')
        )
    ).select_related('user')

def get_category_stats():
    """Get category statistics with aggregation."""
    return Category.objects.annotate(
        product_count=Count('products', filter=Q(products__is_active=True)),
        avg_price=Avg('products__price', filter=Q(products__is_active=True)),
        total_stock=Sum('products__stock_quantity', filter=Q(products__is_active=True))
    ).filter(is_active=True)

def get_user_order_summary(user_id: int):
    """Get user order summary with aggregation."""
    return User.objects.filter(id=user_id).aggregate(
        total_orders=Count('orders'),
        total_spent=Sum('orders__total_amount'),
        avg_order_value=Avg('orders__total_amount')
    )

def bulk_update_prices(category_id: int, percentage_increase: float):
    """Bulk update product prices using F expressions."""
    Product.objects.filter(category_id=category_id).update(
        price=F('price') * (1 + percentage_increase / 100)
    )

def get_popular_products_by_category():
    """Get popular products grouped by category."""
    return Product.objects.select_related('category').annotate(
        order_count=Count('orderitem')
    ).filter(
        is_active=True,
        order_count__gt=0
    ).order_by('category__name', '-order_count')

# ✅ Good: Using raw SQL when necessary
def get_monthly_sales_report():
    """Get monthly sales report using raw SQL."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as order_count,
                SUM(total_amount) as total_revenue
            FROM orders
            WHERE created_at >= %s
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        """, [timezone.now() - timedelta(days=365)])

        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

# ❌ Bad: N+1 queries
def bad_get_products_with_categories():
    products = Product.objects.filter(is_active=True)
    for product in products:
        print(product.category.name)  # N+1 query!

def bad_get_order_totals():
    orders = Order.objects.all()
    for order in orders:
        total = sum(item.total_price for item in order.items.all())  # N+1 query!
```

### 2. Database Indexes and Performance | 数据库索引和性能

```python
# ✅ Good: Proper indexing in models

class Product(TimeStampedModel):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)

    class Meta:
        indexes = [
            # Single column indexes
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['featured']),

            # Composite indexes for common query patterns
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_active', 'featured']),
            models.Index(fields=['category', 'is_active', '-created_at']),

            # Partial indexes (PostgreSQL)
            models.Index(
                fields=['price'],
                condition=models.Q(is_active=True),
                name='active_products_price_idx'
            ),
        ]

# ✅ Good: Database-specific optimizations
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField

class Article(TimeStampedModel):
    """Article model with full-text search (PostgreSQL)."""
    title = models.CharField(max_length=200)
    content = models.TextField()
    search_vector = SearchVectorField(null=True)

    class Meta:
        indexes = [
            GinIndex(fields=['search_vector']),
        ]

# Custom migration for search vector
# migrations/xxxx_add_search_vector.py
from django.contrib.postgres.search import SearchVector
from django.db import migrations

def update_search_vector(apps, schema_editor):
    Article = apps.get_model('myapp', 'Article')
    Article.objects.update(
        search_vector=SearchVector('title', weight='A') + SearchVector('content', weight='B')
    )

class Migration(migrations.Migration):
    dependencies = [
        ('myapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(update_search_vector),
    ]
```

## Testing Django Applications | 测试 Django 应用程序

### 1. Model and View Testing | 模型和视图测试

```python
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.exceptions import ValidationError
from decimal import Decimal

User = get_user_model()

class ProductModelTest(TestCase):
    """Test cases for Product model."""

    def setUp(self):
        """Set up test data."""
        self.category = Category.objects.create(
            name="Electronics",
            slug="electronics"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )

    def test_product_creation(self):
        """Test product creation with valid data."""
        product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            description="Test description",
            price=Decimal('99.99'),
            stock_quantity=10,
            category=self.category
        )

        self.assertEqual(product.name, "Test Product")
        self.assertEqual(product.slug, "test-product")
        self.assertTrue(product.is_in_stock)
        self.assertEqual(str(product), "Test Product")

    def test_product_reduce_stock(self):
        """Test stock reduction functionality."""
        product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            description="Test description",
            price=Decimal('99.99'),
            stock_quantity=10,
            category=self.category
        )

        # Test successful stock reduction
        product.reduce_stock(5)
        self.assertEqual(product.stock_quantity, 5)

        # Test insufficient stock error
        with self.assertRaises(ValueError):
            product.reduce_stock(10)

    def test_product_absolute_url(self):
        """Test product absolute URL."""
        product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            description="Test description",
            price=Decimal('99.99'),
            category=self.category
        )

        expected_url = reverse('product-detail', kwargs={'slug': 'test-product'})
        self.assertEqual(product.get_absolute_url(), expected_url)

class ProductViewTest(TestCase):
    """Test cases for Product views."""

    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.category = Category.objects.create(
            name="Electronics",
            slug="electronics"
        )
        self.product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            description="Test description",
            price=Decimal('99.99'),
            stock_quantity=10,
            category=self.category
        )

    def test_product_list_view(self):
        """Test product list view."""
        response = self.client.get(reverse('product-list'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Product")
        self.assertIn('products', response.context)

    def test_product_detail_view(self):
        """Test product detail view."""
        response = self.client.get(
            reverse('product-detail', kwargs={'slug': 'test-product'})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['product'], self.product)
        self.assertContains(response, "Test Product")

    def test_product_list_filtering(self):
        """Test product list filtering by category."""
        response = self.client.get(
            reverse('product-list'),
            {'category': 'electronics'}
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Product")

    def test_product_search(self):
        """Test product search functionality."""
        response = self.client.get(
            reverse('product-list'),
            {'q': 'Test'}
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Product")

class OrderViewTest(TestCase):
    """Test cases for Order views."""

    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.category = Category.objects.create(
            name="Electronics",
            slug="electronics"
        )
        self.product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            description="Test description",
            price=Decimal('99.99'),
            stock_quantity=10,
            category=self.category
        )

    def test_create_order_requires_login(self):
        """Test that creating order requires authentication."""
        response = self.client.post(reverse('create-order'))
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_create_order_success(self):
        """Test successful order creation."""
        self.client.login(username="testuser", password="testpass123")

        # Add item to cart
        session = self.client.session
        session['cart'] = {str(self.product.id): 2}
        session.save()

        response = self.client.post(reverse('create-order'), {
            'shipping_address': '123 Test St, Test City',
            'notes': 'Test order'
        })

        self.assertEqual(response.status_code, 302)  # Redirect after success

        # Check order was created
        order = Order.objects.get(user=self.user)
        self.assertEqual(order.total_amount, Decimal('199.98'))
        self.assertEqual(order.items.count(), 1)

        # Check stock was reduced
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
```

## Performance Checklist | 性能检查清单

- [ ] Database queries are optimized with select_related and prefetch_related
- [ ] Proper indexes are defined for common query patterns
- [ ] N+1 query problems are avoided
- [ ] Bulk operations are used for large data sets
- [ ] Database-level constraints and validations are implemented
- [ ] Caching is implemented for expensive queries
- [ ] Database connection pooling is configured
- [ ] Query performance is monitored and analyzed
- [ ] Raw SQL is used judiciously for complex queries
- [ ] Database migrations are optimized for production

## 性能检查清单

- [ ] 使用 select_related 和 prefetch_related 优化数据库查询
- [ ] 为常见查询模式定义适当的索引
- [ ] 避免 N+1 查询问题
- [ ] 对大数据集使用批量操作
- [ ] 实现数据库级约束和验证
- [ ] 为昂贵的查询实现缓存
- [ ] 配置数据库连接池
- [ ] 监控和分析查询性能
- [ ] 明智地使用原始 SQL 进行复杂查询
- [ ] 为生产环境优化数据库迁移
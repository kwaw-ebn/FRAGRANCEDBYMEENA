import os, re, secrets, time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from contextlib import asynccontextmanager
import jwt
from pwdlib import PasswordHash
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, field_validator
from sqlalchemy import create_engine, String, Integer, Numeric, Boolean, Text, JSON, ForeignKey, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session

URL = os.getenv('DATABASE_URL', 'sqlite:///./meena.db').replace('postgres://', 'postgresql+psycopg://', 1)
if URL.startswith('postgresql://'): URL = URL.replace('postgresql://', 'postgresql+psycopg://', 1)
engine = create_engine(URL, connect_args={'check_same_thread': False} if URL.startswith('sqlite') else {}, pool_pre_ping=True)
Sessions = sessionmaker(engine, expire_on_commit=False)
SECRET = os.getenv('JWT_SECRET') or secrets.token_urlsafe(48)
if not URL.startswith('sqlite') and not os.getenv('JWT_SECRET'): raise RuntimeError('JWT_SECRET is required with PostgreSQL')
passwords = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)

class Base(DeclarativeBase): pass
class User(Base):
    __tablename__='users'
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(30), default='ADMIN')
class Taxonomy(Base):
    __tablename__='taxonomies'
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    name: Mapped[str] = mapped_column(String(120))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
class Product(Base):
    __tablename__='products'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    brand: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    gender: Mapped[str] = mapped_column(String(30), default='Unisex')
    family: Mapped[str] = mapped_column(String(100), default='')
    description: Mapped[str] = mapped_column(Text, default='')
    price: Mapped[Decimal|None] = mapped_column(Numeric(12,2), nullable=True)
    compare_at: Mapped[Decimal|None] = mapped_column(Numeric(12,2), nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    low_stock: Mapped[int] = mapped_column(Integer, default=5)
    size: Mapped[str] = mapped_column(String(60), default='')
    notes: Mapped[str] = mapped_column(Text, default='')
    images: Mapped[list] = mapped_column(JSON, default=list)
    alt: Mapped[str] = mapped_column(String(250), default='')
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    bestseller: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    seo_title: Mapped[str] = mapped_column(String(180), default='')
    meta_description: Mapped[str] = mapped_column(String(320), default='')
class Order(Base):
    __tablename__='orders'
    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(60), unique=True)
    access_token: Mapped[str] = mapped_column(String(80), unique=True)
    customer: Mapped[dict] = mapped_column(JSON)
    items: Mapped[list] = mapped_column(JSON)
    total: Mapped[Decimal] = mapped_column(Numeric(12,2))
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(12,2), default=0)
    status: Mapped[str] = mapped_column(String(40), default='Pending')
    payment_status: Mapped[str] = mapped_column(String(40), default='Pending')
    payment_method: Mapped[str] = mapped_column(String(40), default='Pay on confirmation')
    inventory_deducted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat())
class Entry(Base):
    __tablename__='content_entries'
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat())

BRANDS=['ZARA','AFNAN','ARMAF','LATTAFA','KHADLAJ','RAYHAAN','BATH & BODY WORKS']
CATEGORIES=['Perfumes','Arabian Perfumes','Designer Perfumes','Diffusers','Air Fresheners','Body Mists','Gift Sets','Combo Deals']
CATALOG={
'ZARA':['Cherry Temptation','Rose Gourmand','Hibiscus','Gardenia Orchid','Wonder Rose','Tobacco Duo','Vanilla Duo','Herbal Collection','Vibrant Leather','Bogoss Vibrant Leather Wave','Bogoss Vibrant Leather Fire'],
'AFNAN':['9PM','9PM Night Out','9PM Elixir','Supremacy in Oud',"Supremacy Collector’s Edition"],
'ARMAF':['Club de Nuit Sillage','Club de Nuit Intense Man Limited Edition','Club de Nuit Intense Man EDP'],
'LATTAFA':['Khamrah','Khamrah Qahwa','Fakhar Rose','Oud for Glory','Honor & Glory','Tharwah Gold','Angham','Angham Second Song','Qimmah','Mayar','Nebras','Qaed Al Fursan Unlimited','Eclaire'],
'KHADLAJ':['Fursan White','Nuha Vanilla Pearl','Café Latte'],
'RAYHAAN':['Floriana','Rayhaan Aquatica','Rayhaan Obsidian','Rayhaan Terra'],
'BATH & BODY WORKS':['Vanilla Romance','Oh Cherry','Cucumber Melon','Gingham Gorgeous','Dressed in White','Pink Obsessed','Midnight Addiction','Warm Vanilla','Dream Bright',"You’re The One",'Book Loft']}
def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with Sessions() as db:
        if not db.scalar(select(func.count(Product.id))):
            for brand,names in CATALOG.items():
                for name in names: db.add(Product(name=name,slug=slug(brand+' '+name),brand=brand,category='Body Mists' if brand=='BATH & BODY WORKS' else 'Perfumes',bestseller=name in ['Khamrah','Fursan White'],featured=name in ['Rose Gourmand','Khamrah Qahwa','Hibiscus'],description='Contact our fragrance team for size, availability and pricing.'))
            db.add(Product(name='Red Temptation Elixir',slug='zara-red-temptation-elixir',brand='ZARA',category='Perfumes',featured=True))
            for name in ['Affection Gift Set','Lattafa 5-in-1 Set','Vintage Radio Gift Set']: db.add(Product(name=name,slug=slug(name),brand='LATTAFA',category='Gift Sets'))
            for kind,names in [('brand',BRANDS),('category',CATEGORIES)]:
                for name in names: db.add(Taxonomy(kind=kind,name=name))
        # Match uploaded photos to existing catalogue records on each startup.
        # Never alter prices or stock quantities.
        photo_map={"ZARA|Rose Gourmand":["zara-rose-gourmand","zara-rose-gourmand-duo","zara-rose-gourmand-additional"],"ZARA|Red Temptation Elixir":["zara-red-temptation-elixir"],"LATTAFA|Eclaire":["lattafa-eclaire"],"LATTAFA|Fakhar Rose":["lattafa-fakhar-rose"],"LATTAFA|Honor & Glory":["lattafa-honor-and-glory"],"LATTAFA|Khamrah Qahwa":["lattafa-khamrah-qahwa"],"LATTAFA|Nebras":["lattafa-nebras-bottle","lattafa-nebras-packaging"],"LATTAFA|Qaed Al Fursan Unlimited":["lattafa-qaed-al-fursan-unlimited"],"LATTAFA|Qimmah":["lattafa-qimmah-for-women"],"KHADLAJ|Café Latte":["khadlaj-cafe-latte"],"RAYHAAN|Floriana":["rayhaan-floriana"],"BATH & BODY WORKS|Dream Bright":["bath-body-works-dream-bright"],"BATH & BODY WORKS|Midnight Addiction":["bath-body-works-midnight-addiction"],"BATH & BODY WORKS|Vanilla Romance":["bath-body-works-vanilla-romance"],"BATH & BODY WORKS|Warm Vanilla":["bath-body-works-warm-vanilla-sugar"],"BATH & BODY WORKS|You’re The One":["bath-body-works-youre-the-one"]}
        for key, filenames in photo_map.items():
            brand, name = key.split('|', 1)
            p = db.scalar(select(Product).where(Product.brand == brand, Product.name == name))
            if p:
                p.images = ['/products/' + filename + '.webp' for filename in filenames]
                p.alt = brand + ' ' + name + ' perfume at FragrancedByMeena Ghana'
        email,pw=os.getenv('INITIAL_ADMIN_EMAIL'),os.getenv('INITIAL_ADMIN_PASSWORD')
        if email and pw and not db.scalar(select(User).where(User.email==email.lower())):
            if len(pw)<12: raise RuntimeError('Initial admin password must be at least 12 characters')
            db.add(User(email=email.lower(),password=passwords.hash(pw),role='SUPER_ADMIN'))
        db.commit()
    yield
app=FastAPI(title='FragrancedByMeena API',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=[os.getenv('FRONTEND_URL','http://localhost:3000')],allow_methods=['GET','POST','PUT','DELETE'],allow_headers=['Authorization','Content-Type'])
limits=defaultdict(deque)
@app.middleware('http')
async def security(request: Request,call_next):
    if request.method!='GET':
        key=(request.client.host if request.client else 'unknown',request.url.path)
        now=time.monotonic(); q=limits[key]
        while q and q[0]<now-60:q.popleft()
        if len(q)>=30:
            from fastapi.responses import JSONResponse
            return JSONResponse({'detail':'Please wait before trying again.'},status_code=429)
        q.append(now)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='strict-origin-when-cross-origin'
    return response

def db_session():
    with Sessions() as db: yield db
def admin(auth: HTTPAuthorizationCredentials|None=Depends(bearer),db: Session=Depends(db_session)):
    try:
        data=jwt.decode(auth.credentials if auth else '',SECRET,algorithms=['HS256'])
        user=db.get(User,int(data['sub']))
        if not user or user.role not in ['SUPER_ADMIN','ADMIN','STAFF']:raise ValueError()
        return user
    except Exception:raise HTTPException(401,'Please sign in to the admin dashboard.')
def product_data(p):
    return {c.name:float(getattr(p,c.name)) if isinstance(getattr(p,c.name),Decimal) else getattr(p,c.name) for c in Product.__table__.columns}
def order_data(o,private=False):
    d={'reference':o.reference,'total':float(o.total),'delivery_fee':float(o.delivery_fee),'status':o.status,'payment_status':o.payment_status,'payment_method':o.payment_method,'created_at':o.created_at,'items':o.items}
    if private:d.update(id=o.id,customer=o.customer)
    return d
class Login(BaseModel):email: str; password: str
@app.post('/api/auth/login')
def login(body:Login,db:Session=Depends(db_session)):
    u=db.scalar(select(User).where(User.email==body.email.lower()))
    if not u or not passwords.verify(body.password,u.password):raise HTTPException(401,'Email or password is incorrect.')
    return {'token':jwt.encode({'sub':str(u.id),'exp':datetime.now(timezone.utc)+timedelta(hours=2)},SECRET,algorithm='HS256'),'email':u.email}
class PasswordChange(BaseModel):current_password:str;new_password:str=Field(min_length=12,max_length=200)
@app.post('/api/admin/password')
def change_password(body:PasswordChange,u:User=Depends(admin),db:Session=Depends(db_session)):
    if not passwords.verify(body.current_password,u.password):raise HTTPException(400,'Current password is incorrect.')
    u.password=passwords.hash(body.new_password);db.commit();return {'ok':True}
@app.get('/api/health')
def health(db:Session=Depends(db_session)): db.execute(select(1));return {'status':'ok'}
@app.get('/api/products')
def products(q:str='',brand:str='',category:str='',family:str='',gender:str='',featured:bool=False,bestseller:bool=False,is_new:bool=False,sort:str='name',page:int=1,limit:int=24,db:Session=Depends(db_session)):
    stmt=select(Product).where(Product.published==True)
    if q:
        pattern='%'+q[:100]+'%';stmt=stmt.where(Product.name.ilike(pattern)|Product.brand.ilike(pattern)|Product.family.ilike(pattern)|Product.notes.ilike(pattern)|Product.description.ilike(pattern))
    for key,val in [('brand',brand),('category',category),('family',family),('gender',gender),('featured',featured),('bestseller',bestseller),('is_new',is_new)]:
        if val:stmt=stmt.where(getattr(Product,key)==val)
    total=db.scalar(select(func.count()).select_from(stmt.subquery()))
    stmt=stmt.order_by(Product.price.asc().nullslast() if sort=='price-asc' else Product.price.desc().nullslast() if sort=='price-desc' else Product.id.desc() if sort=='newest' else Product.name)
    return {'items':[product_data(p) for p in db.scalars(stmt.offset((max(1,page)-1)*min(100,max(1,limit))).limit(min(100,max(1,limit))))],'total':total}
@app.get('/api/products/{slug_value}')
def detail(slug_value:str,db:Session=Depends(db_session)):
    p=db.scalar(select(Product).where(Product.slug==slug_value,Product.published==True))
    if not p:raise HTTPException(404,'Product not found')
    return product_data(p)
@app.get('/api/taxonomies')
def taxonomies(db:Session=Depends(db_session)):return [{'id':x.id,'kind':x.kind,'name':x.name,'active':x.active} for x in db.scalars(select(Taxonomy).where(Taxonomy.active==True))]
class ProductInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    name:str=Field(min_length=1,max_length=160);brand:str=Field(max_length=100);category:str=Field(max_length=100)
    slug:str=Field(default='',max_length=180);gender:str=Field(default='Unisex',max_length=30);family:str=Field(default='',max_length=100)
    description:str=Field(default='',max_length=10000);price:Decimal|None=Field(default=None,gt=0,max_digits=12,decimal_places=2)
    compare_at:Decimal|None=Field(default=None,gt=0,max_digits=12,decimal_places=2)
    stock:int=Field(default=0,ge=0);low_stock:int=Field(default=5,ge=0);size:str=Field(default='',max_length=60)
    notes:str=Field(default='',max_length=2000);images:list[str]=Field(default_factory=list,max_length=12);alt:str=Field(default='',max_length=250)
    featured:bool=False;bestseller:bool=False;is_new:bool=False;published:bool=True
    seo_title:str=Field(default='',max_length=180);meta_description:str=Field(default='',max_length=320)
    @field_validator('images')
    @classmethod
    def safe_images(cls,vals):
        if any(not (x.startswith('https://') or re.fullmatch(r'/products/[a-z0-9-]+\.webp',x)) for x in vals):raise ValueError('Images must use HTTPS URLs')
        return vals
@app.get('/api/admin/products',dependencies=[Depends(admin)])
def admin_products(db:Session=Depends(db_session)):return [product_data(p) for p in db.scalars(select(Product).order_by(Product.id.desc()))]
@app.post('/api/admin/products',dependencies=[Depends(admin)])
def add_product(body:ProductInput,db:Session=Depends(db_session)):
    data=body.model_dump();data['slug']=slug(data['slug'] or data['brand']+' '+data['name'])
    if db.scalar(select(Product).where(Product.slug==data['slug'])):raise HTTPException(409,'Choose a unique product slug.')
    p=Product(**data);db.add(p);db.commit();return product_data(p)
@app.put('/api/admin/products/{id}',dependencies=[Depends(admin)])
def edit_product(id:int,body:ProductInput,db:Session=Depends(db_session)):
    p=db.get(Product,id)
    if not p:raise HTTPException(404,'Product not found')
    data=body.model_dump();data['slug']=slug(data['slug'] or data['brand']+' '+data['name'])
    if db.scalar(select(Product).where(Product.slug==data['slug'],Product.id!=id)):raise HTTPException(409,'Choose a unique product slug.')
    for k,v in data.items():setattr(p,k,v)
    db.commit();return product_data(p)
@app.delete('/api/admin/products/{id}',dependencies=[Depends(admin)])
def remove_product(id:int,db:Session=Depends(db_session)):
    p=db.get(Product,id)
    if not p:raise HTTPException(404,'Product not found')
    db.delete(p);db.commit();return {'ok':True}
@app.post('/api/admin/upload',dependencies=[Depends(admin)])
async def upload(file:UploadFile=File()):
    if not os.getenv('CLOUDINARY_URL'):raise HTTPException(503,'Image storage has not been configured. Use an HTTPS image URL for now.')
    content=await file.read(6*1024*1024)
    if len(content)>5*1024*1024:raise HTTPException(413,'Maximum image size is 5 MB.')
    if not (content.startswith(b'\xff\xd8\xff') or content.startswith(b'\x89PNG\r\n\x1a\n') or (content[:4]==b'RIFF' and content[8:12]==b'WEBP')):raise HTTPException(400,'Upload a JPEG, PNG or WebP photograph.')
    import cloudinary.uploader
    result=cloudinary.uploader.upload(content,folder='fragrancedbymeena',resource_type='image',format='webp')
    return {'url':result['secure_url'],'width':result['width'],'height':result['height']}
class TaxonomyInput(BaseModel):kind:str=Field(pattern='^(brand|category|collection)$');name:str=Field(min_length=1,max_length=120);active:bool=True
@app.post('/api/admin/taxonomies',dependencies=[Depends(admin)])
def add_taxonomy(body:TaxonomyInput,db:Session=Depends(db_session)):
    t=Taxonomy(**body.model_dump());db.add(t);db.commit();return {'id':t.id}
@app.delete('/api/admin/taxonomies/{id}',dependencies=[Depends(admin)])
def delete_taxonomy(id:int,db:Session=Depends(db_session)):
    t=db.get(Taxonomy,id)
    if not t:raise HTTPException(404,'Not found')
    t.active=False;db.commit();return {'ok':True}
class Customer(BaseModel):
    name:str=Field(min_length=2,max_length=120);phone:str=Field(min_length=9,max_length=25);email:str=Field(default='',max_length=254)
    region:str=Field(default='',max_length=80);town:str=Field(default='',max_length=100);address:str=Field(default='',max_length=500)
    digital_address:str=Field(default='',max_length=60);landmark:str=Field(default='',max_length=200);instructions:str=Field(default='',max_length=1000)
    delivery:str=Field(pattern='^(pickup|delivery)$');zone_id:int|None=None
class Line(BaseModel):product_id:int;quantity:int=Field(ge=1,le=50)
class Checkout(BaseModel):customer:Customer;items:list[Line]=Field(min_length=1,max_length=50)
@app.post('/api/checkout')
def checkout(body:Checkout,db:Session=Depends(db_session)):
    lines=[];total=Decimal(0);aggregated={}
    for line in body.items:aggregated[line.product_id]=aggregated.get(line.product_id,0)+line.quantity
    for id,qty in aggregated.items():
        p=db.get(Product,id)
        if not p or not p.published or p.price is None:raise HTTPException(400,'A product is unavailable or awaiting a price.')
        if qty>50 or p.stock<qty:raise HTTPException(409,f'{p.name} has insufficient stock.')
        total+=p.price*qty;lines.append({'product_id':p.id,'name':p.name,'price':float(p.price),'quantity':qty})
    fee=Decimal(0)
    if body.customer.delivery=='delivery':
        zone=db.get(Entry,body.customer.zone_id) if body.customer.zone_id else None
        if not zone or zone.kind!='delivery' or not zone.data.get('active'):raise HTTPException(400,'Choose a configured delivery zone or pickup.')
        fee=Decimal(str(zone.data['fee']))
        if not body.customer.address.strip():raise HTTPException(400,'Enter your delivery address.')
    o=Order(reference='FBM-'+datetime.now().strftime('%Y')+'-'+secrets.token_hex(5).upper(),access_token=secrets.token_urlsafe(32),customer=body.customer.model_dump(),items=lines,total=total+fee,delivery_fee=fee)
    db.add(o);db.commit();return {**order_data(o),'access_token':o.access_token}
@app.get('/api/orders/{reference}')
def track(reference:str,token:str,db:Session=Depends(db_session)):
    o=db.scalar(select(Order).where(Order.reference==reference,Order.access_token==token))
    if not o:raise HTTPException(404,'Order not found. Check your reference and tracking key.')
    return order_data(o)
@app.get('/api/admin/orders',dependencies=[Depends(admin)])
def orders(db:Session=Depends(db_session)):return [order_data(o,True) for o in db.scalars(select(Order).order_by(Order.id.desc()))]
class Status(BaseModel):status:str=Field(pattern='^(Pending|Confirmed|Processing|Packed|Out for Delivery|Delivered|Cancelled|Returned)$')
@app.put('/api/admin/orders/{id}',dependencies=[Depends(admin)])
def update_order(id:int,body:Status,db:Session=Depends(db_session)):
    o=db.scalar(select(Order).where(Order.id==id).with_for_update())
    if not o:raise HTTPException(404,'Order not found')
    if o.status in ['Cancelled','Returned'] and body.status not in ['Cancelled','Returned']:raise HTTPException(409,'Closed orders cannot be reopened; create a new order.')
    if body.status in ['Confirmed','Processing','Packed','Out for Delivery','Delivered'] and not o.inventory_deducted:
        for line in sorted(o.items,key=lambda x:x['product_id']):
            p=db.scalar(select(Product).where(Product.id==line['product_id']).with_for_update())
            if not p or p.stock<line['quantity']:raise HTTPException(409,'Insufficient inventory to confirm this order.')
            p.stock-=line['quantity']
        o.inventory_deducted=True
    if body.status in ['Cancelled','Returned'] and o.inventory_deducted:
        for line in sorted(o.items,key=lambda x:x['product_id']):
            p=db.scalar(select(Product).where(Product.id==line['product_id']).with_for_update())
            if p:p.stock+=line['quantity']
        o.inventory_deducted=False
    o.status=body.status;db.commit();return order_data(o,True)
class ContentInput(BaseModel):
    kind:str=Field(pattern='^(blog|delivery|settings)$');data:dict
@app.get('/api/content/{kind}')
def content(kind:str,db:Session=Depends(db_session)):
    if kind not in ['blog','delivery','settings']:raise HTTPException(404,'Not found')
    return [{'id':e.id,**e.data} for e in db.scalars(select(Entry).where(Entry.kind==kind)) if kind=='settings' or e.data.get('published') or e.data.get('active')]
@app.get('/api/admin/content',dependencies=[Depends(admin)])
def all_content(db:Session=Depends(db_session)):return [{'id':e.id,'kind':e.kind,'data':e.data,'created_at':e.created_at} for e in db.scalars(select(Entry))]
@app.post('/api/admin/content',dependencies=[Depends(admin)])
def create_content(body:ContentInput,db:Session=Depends(db_session)):
    if body.kind=='delivery':
        try:fee=Decimal(str(body.data['fee']))
        except Exception:raise HTTPException(400,'Enter a valid delivery fee.')
        if not fee.is_finite() or fee<0:raise HTTPException(400,'Delivery fee must be non-negative.')
    e=Entry(kind=body.kind,data=body.data);db.add(e);db.commit();return {'id':e.id}
@app.delete('/api/admin/content/{id}',dependencies=[Depends(admin)])
def delete_content(id:int,db:Session=Depends(db_session)):
    e=db.get(Entry,id)
    if not e:raise HTTPException(404,'Not found')
    db.delete(e);db.commit();return {'ok':True}
class Contact(BaseModel):name:str=Field(min_length=2,max_length=120);email:str=Field(min_length=3,max_length=254);message:str=Field(min_length=5,max_length=5000)
@app.post('/api/contact')
def contact(body:Contact,db:Session=Depends(db_session)):
    db.add(Entry(kind='contact',data=body.model_dump()));db.commit();return {'message':'Your message has been received.'}
class Newsletter(BaseModel):email:str=Field(min_length=3,max_length=254);consent:bool
@app.post('/api/newsletter')
def newsletter(body:Newsletter,db:Session=Depends(db_session)):
    if not body.consent or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$',body.email):raise HTTPException(400,'Enter a valid email and agree to receive updates.')
    db.add(Entry(kind='newsletter',data=body.model_dump()));db.commit();return {'message':'Thank you for subscribing.'}

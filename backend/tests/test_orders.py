import os
os.environ['DATABASE_URL']='sqlite:///./test-meena.db'
os.environ['JWT_SECRET']='test-only-secret-with-at-least-thirty-two-characters'
os.environ['INITIAL_ADMIN_EMAIL']='owner@example.test'
os.environ['INITIAL_ADMIN_PASSWORD']='test-only-password-1234'
from fastapi.testclient import TestClient
from app.main import app,Base,engine,limits
import pytest
@pytest.fixture()
def client():
    Base.metadata.drop_all(engine);limits.clear()
    with TestClient(app) as c:yield c
@pytest.fixture()
def auth(client):
    r=client.post('/api/auth/login',json={'email':'owner@example.test','password':'test-only-password-1234'})
    assert r.status_code==200
    return {'Authorization':'Bearer '+r.json()['token']}
def priced(client,auth,stock=3):
    r=client.post('/api/admin/products',headers=auth,json={'name':'Test fragrance','brand':'Test','category':'Perfumes','price':'100.00','stock':stock})
    assert r.status_code==200,r.text
    return r.json()
def order(client,p,qty=2):return client.post('/api/checkout',json={'customer':{'name':'Test customer','phone':'0591000000','delivery':'pickup'},'items':[{'product_id':p['id'],'quantity':qty}]})
def test_admin_protected(client):assert client.get('/api/admin/products').status_code==401
def test_unknown_price_and_stock_rejected(client,auth):
    p=client.get('/api/products').json()['items'][0]
    assert order(client,p,1).status_code==400
    assert order(client,priced(client,auth),4).status_code==409
def test_confirm_deducts_once_cancel_restores(client,auth):
    p=priced(client,auth);r=order(client,p);assert r.status_code==200,r.text
    o=r.json();assert o['total']==200;assert o['payment_status']=='Pending'
    assert client.get('/api/orders/'+o['reference'],params={'token':'wrong'}).status_code==404
    assert client.get('/api/orders/'+o['reference'],params={'token':o['access_token']}).status_code==200
    id=client.get('/api/admin/orders',headers=auth).json()[0]['id']
    for status in ['Confirmed','Processing']:
        assert client.put('/api/admin/orders/'+str(id),headers=auth,json={'status':status}).status_code==200
        assert client.get('/api/products/'+p['slug']).json()['stock']==1
    assert client.put('/api/admin/orders/'+str(id),headers=auth,json={'status':'Cancelled'}).status_code==200
    assert client.get('/api/products/'+p['slug']).json()['stock']==3
    assert client.put('/api/admin/orders/'+str(id),headers=auth,json={'status':'Confirmed'}).status_code==409
    assert client.get('/api/admin/orders',headers=auth).json()[0]['payment_status']=='Pending'
def test_failed_confirmation_rolls_back(client,auth):
    p=priced(client,auth,stock=2);a=order(client,p);b=order(client,p)
    orders=client.get('/api/admin/orders',headers=auth).json()
    assert client.put('/api/admin/orders/'+str(orders[0]['id']),headers=auth,json={'status':'Confirmed'}).status_code==200
    assert client.put('/api/admin/orders/'+str(orders[1]['id']),headers=auth,json={'status':'Confirmed'}).status_code==409
    assert client.get('/api/products/'+p['slug']).json()['stock']==0
    assert client.get('/api/admin/orders',headers=auth).json()[1]['status']=='Pending'
def test_delivery_fee_validated_and_included(client,auth):
    p=priced(client,auth)
    assert client.post('/api/admin/content',headers=auth,json={'kind':'delivery','data':{'name':'Invalid','fee':-5,'active':True}}).status_code==400
    z=client.post('/api/admin/content',headers=auth,json={'kind':'delivery','data':{'name':'Test area','fee':25,'active':True}}).json()
    r=client.post('/api/checkout',json={'customer':{'name':'Test customer','phone':'0591000000','delivery':'delivery','address':'Test address','zone_id':z['id']},'items':[{'product_id':p['id'],'quantity':1}]})
    assert r.status_code==200,r.text
    assert r.json()['total']==125

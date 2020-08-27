from odoo import http, tools
from odoo.http import request, Response, AuthenticationError
from datetime import datetime

class AGTree(http.Controller):
  
  @http.route('/ag_tree/get_account', type='json', auth="none", csrf=False, save_session=False)
  def get_account(self, **kwargs):
      json_list = []
      search_list = [
        ('type', '=', 'contract'),
        ('ag_is_bon_commande_ft', '=', True),
        ('date_start', '<=', datetime.today().strftime(tools.DEFAULT_SERVER_DATE_FORMAT)),
        '|',
        ('date', '>=', datetime.today().strftime(tools.DEFAULT_SERVER_DATE_FORMAT)),
        ('date', '=', False)
      ]
      account_analytic_env = request.env()['account.analytic.account']
      account_ids = account_analytic_env.sudo().search(search_list)
      parent_list = []
      for obj in account_ids:
        parent = obj.parent_id.id or "#"
        parent_list.append(parent)
        json_list.append({
          'id': obj.id,
          'text': obj.name,
          'parent': str(parent)
        })
      while len(parent_list) > 0:
        account_ids = account_analytic_env.sudo().search([('id', 'in', parent_list)])
        tmp_list = []
        for obj in account_ids:
          if obj.parent_id:
            tmp_list.append(obj.parent_id.id)
          parent = obj.parent_id.id or "#"
          json_list.append({
            'id': obj.id,
            'text': obj.name,
            'parent': str(parent)
          })
        parent_list = tmp_list
      return json_list
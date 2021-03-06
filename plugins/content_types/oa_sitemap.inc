<?php
/**
 * @file oa_sitemap.inc
 */

$plugin = array(
  'title' => t('Site Map'),
  'description' => t('Displays the site map of a space.'),
  'single' => TRUE,
  'category' => array(t('Open Atrium'), -9),
  'edit form' => 'oa_sitemap_settings_form',
  'render callback' => 'oa_sitemap_render',
  'required context' => new ctools_context_optional(t('Node'), 'node'),
  'defaults' => array(
    'oa_sitemap_parent' => FALSE,
  ),
);

/**
 * Run-time rendering of the body of the pane.
 *
 * @see ctools_plugin_examples for more advanced info
 */
function oa_sitemap_render($subtype, $conf, $args, $context) {
  $node = NULL;
  if (isset($context->data)) {
    $node = $context->data;
  }
  $space_id = isset($node) ? $node->nid : 0;

  $title = (empty($node) || !empty($conf['oa_sitemap_parent'])) ? variable_get('site_name', '') : $node->title;
  $page_title = !empty($title) ? t('Site Map for @space', array('@space' => $title)) : t('Site Map');

  $base = drupal_get_path('module', 'oa_sitemap');

  drupal_add_js(array('oa_sitemap' => array('topID' => $space_id)), 'setting');

  drupal_add_js($base . '/js/oa_sitemap.js');
  drupal_add_css($base . '/css/oa_sitemap.css');

  ctools_include('modal');
  ctools_modal_add_js();

  drupal_set_title($page_title);

  $terms = oa_sections_get_icons();
  $icons = array();
  $icons[0] = '<i class="icon-plus"></i>';
  foreach ($terms as $id => $term) {
    if (!empty($term->field_oa_icon_class_value)) {
      $icon = '<i class="' . check_plain($term->field_oa_icon_class_value) . '"></i>';
    }
    elseif (!empty($term->field_oa_icon_image_fid)) {
      $file = file_load($term->field_oa_icon_image_fid);
      $content = array(
        'file' => array(
          '#theme' => 'image_style',
          '#style_name' => 'oa_medium_thumbnail',
          '#path' => $file->uri,
        ),
      );
      $icon = drupal_render($content);
    }
    else {
      $icon = '<i class="icon-th-large"></i>';
    }
    $icons[$id] = $icon;
  }

  $top_id = empty($conf['oa_sitemap_parent']) ? $space_id : 0;
  $options = array();
  if ($top_id == 0) {
    $options[0] = $title;
  }
  $map = oa_sitemap_space_map($top_id, $options, $icons);

  $map_link = '';
  if (empty($conf['oa_sitemap_parent']) && ($space_id != 0)) {
    $map_link = l(t('Full sitemap'), 'sitemap_old/' . $space_id);
  }
  $form['search'] = array(
    '#name' => 'oa_sitemap_search',
    '#type' => 'select',
    '#options' => $options,
    '#value' => $top_id,
  );

  $header_vars = array(
    'link' => $map_link,
    'search' => drupal_render($form),
  );
  $header = theme('oa_sitemap_header', $header_vars);

  $block = new stdClass();
  $block->title = '';
  $block->content = $header . $map;
  return $block;
}

/**
 * Empty config form
 */
function oa_sitemap_settings_form($form, &$form_state) {
  $conf = $form_state['conf'];

  $form['oa_sitemap_parent'] = array(
    '#type' => 'checkbox',
    '#title' => t('Show full parent tree'),
    '#default_value' => $conf['oa_sitemap_parent'],
  );

  return $form;
}

/**
 * Saves changes to the widget.
 */
function oa_sitemap_settings_form_submit($form, &$form_state) {
  foreach (array_keys($form_state['values']) as $key) {
    if (isset($form_state['values'][$key])) {
      $form_state['conf'][$key] = $form_state['values'][$key];
    }
  }
}

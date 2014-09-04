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
  'required context' => new ctools_context_required(t('Node'), 'node'),
);

/**
 * Run-time rendering of the body of the pane.
 *
 * @see ctools_plugin_examples for more advanced info
 */
function oa_sitemap_render($subtype, $conf, $args, $context) {
  if (!isset($context->data)) {
    return;
  }
  $node = $context->data;
  drupal_set_title(t('Site Map for @space', array('@space' => $node->title)));

  $terms = oa_sections_get_icons();
  $icons = array();
  foreach ($terms as $id => $term) {
    if (!empty($term->field_icon_class_value)) {
      $icon = '<i class="' . check_plain($term->field_icon_class_value) . '"></i>';
    }
    elseif (!empty($term->field_icon_image_fid)) {
      $file = file_load($term->field_icon_image_fid);
      $content = array(
        'file' => array(
          '#theme' => 'image_style',
          '#style_name' => 'panopoly_thumbnail',
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

  $map = oa_sitemap_space_map($node->nid, $icons);

  $block = new stdClass();
  $block->title = '';
  $block->content = $map;
  return $block;
}

/**
 * Empty config form
 */
function oa_sitemap_settings_form($form, &$form_state) {
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
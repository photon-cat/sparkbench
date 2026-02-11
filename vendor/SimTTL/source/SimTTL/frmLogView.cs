// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SimTTL
{
    public partial class frmLogView : Form
    {
        /// <summary>If true, form closing is allowed.</summary>
        private bool allowClosing;
        /// <summary>Reference to the main form instance.</summary>
        private frmMain MainForm;

        /// <summary>
        /// Constructor of the form.
        /// </summary>
        public frmLogView(frmMain MainForm)
        {
            InitializeComponent();
            allowClosing = false;
            this.MainForm = MainForm;
        }

        /// <summary>
        /// Form closing event handler checking if it can be really closed.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void frmNetlistImportLog_FormClosing(object sender, FormClosingEventArgs e)
        {
            e.Cancel = !AllowClosing;
            if (AllowClosing)
                MainForm.LogView = null;
        }

        /// <summary>
        /// Log the messsage in the list view.
        /// </summary>
        /// <param name="Level">Indent level of the message. Negative values indicate error messages</param>
        /// <param name="Msg">Message string to be logged</param>
        public void Log(int Level, string Msg)
        {
            if (Level < 0)
            {
                lbErrors.Items.Add(Msg);
                lbErrors.SelectedIndex = lbErrors.Items.Count - 1;
            }
        }

        /// <summary>
        /// Close button click event handler.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void btnClose_Click(object sender, EventArgs e)
        {
            if (AllowClosing)
                Close();
        }

        /// <summary>Gets or sets the field that allows closing the form.</summary>
        public bool AllowClosing
        {
            get { return allowClosing; }
            set
            {
                allowClosing = value;
            }
        }

    }
}

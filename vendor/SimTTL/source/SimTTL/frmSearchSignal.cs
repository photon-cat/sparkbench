// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections;
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
    public partial class frmSearchSignal : Form
    {
        /// <summary>Available signal list.</summary>
        public List<DisplaySignal> CurrentSignals;
        /// <summary>List of the indices of possible signals</summary>
        private List<int> idxList;

        /// <summary>
        /// Creates an instance of this form.
        /// </summary>
        public frmSearchSignal()
        {
            InitializeComponent();
            idxList = new List<int>();
            tbSearchText.Focus();
        }

        /// <summary>
        /// TextChanged event handler of the text box to input the search string.
        /// Updates the selection of signals that contain the search sub string.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tbSearchText_TextChanged(object sender, EventArgs e)
        {
            string s = tbSearchText.Text.ToUpper();
            lbPossibleSignals.Items.Clear();
            idxList.Clear();
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                if (CurrentSignals[i].ScreenName.ToUpper().Contains(s))
                {
                    lbPossibleSignals.Items.Add(CurrentSignals[i].ScreenName);
                    idxList.Add(i);
                }
            }
        }

        /// <summary>
        /// DoubleClick event handler of the PossibleSignals listbox.
        /// The double click on a specific signal in the listbox closes the form.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void lbPossibleSignals_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            DialogResult = DialogResult.OK;
            Close();
        }

        /// <summary>
        /// Returns the selected index into the CurrentSignal list from the mouse double click or -1, if nothing had been selected.
        /// </summary>
        public int SelectedIndex
        {
            get 
            { 
                if (lbPossibleSignals.SelectedIndex>=0)
                    return idxList[lbPossibleSignals.SelectedIndex];
                else 
                    return -1;
            }
        }
    }
}
